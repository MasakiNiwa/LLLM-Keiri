/**
 * 精算表（8 桁）: 残高試算表 → 修正記入 → 損益計算書 → 貸借対照表。プログラムが計算する。
 */
import type { AccountBook } from '../content/accounts.ts';
import type { Element } from '../content/schema.ts';
import { ELEMENTS } from '../content/schema.ts';
import type { JournalLine } from '../journal/types.ts';

export interface WorksheetRow {
  account: string;
  element: Element;
  /** 試算表の借方・貸方 */
  tbDr: number;
  tbCr: number;
  /** 修正記入の借方・貸方 */
  adjDr: number;
  adjCr: number;
  /** 損益計算書・貸借対照表の借方・貸方 */
  plDr: number;
  plCr: number;
  bsDr: number;
  bsCr: number;
}

export interface Worksheet {
  rows: WorksheetRow[];
  totals: Omit<WorksheetRow, 'account' | 'element'>;
  /** 当期純利益（マイナスなら純損失） */
  netIncome: number;
}

export function buildWorksheet(
  trialBalance: JournalLine[],
  adjustments: JournalLine[][],
  book: AccountBook,
): Worksheet {
  const map = new Map<string, WorksheetRow>();
  const row = (name: string) => {
    const account = book.canonical(name);
    let r = map.get(account);
    if (!r) {
      r = {
        account,
        element: book.find(account)?.element ?? 'other',
        tbDr: 0,
        tbCr: 0,
        adjDr: 0,
        adjCr: 0,
        plDr: 0,
        plCr: 0,
        bsDr: 0,
        bsCr: 0,
      };
      map.set(account, r);
    }
    return r;
  };
  for (const l of trialBalance) {
    const r = row(l.account);
    if (l.side === 'dr') r.tbDr += l.amount;
    else r.tbCr += l.amount;
  }
  for (const entry of adjustments)
    for (const l of entry) {
      const r = row(l.account);
      if (l.side === 'dr') r.adjDr += l.amount;
      else r.adjCr += l.amount;
    }
  for (const r of map.values()) {
    const bal = r.tbDr - r.tbCr + r.adjDr - r.adjCr;
    const pl = r.element === 'revenue' || r.element === 'expense';
    if (pl) {
      if (bal > 0) r.plDr = bal;
      else r.plCr = -bal;
    } else if (bal > 0) r.bsDr = bal;
    else r.bsCr = -bal;
  }
  const order = new Map(book.accounts.map((a, i) => [a.name, i]));
  const elementOrder = new Map(ELEMENTS.map((e, i) => [e, i]));
  // 試算表にある科目を先に、修正記入で増えた科目をあとに並べる（精算表の書き方）
  const inTb = new Set(trialBalance.map((l) => book.canonical(l.account)));
  const rows = [...map.values()].sort(
    (a, b) =>
      Number(!inTb.has(a.account)) - Number(!inTb.has(b.account)) ||
      (elementOrder.get(a.element) ?? 9) - (elementOrder.get(b.element) ?? 9) ||
      (order.get(a.account) ?? 1e9) - (order.get(b.account) ?? 1e9),
  );
  const sum = (k: keyof Worksheet['totals']) => rows.reduce((s, r) => s + r[k], 0);
  const totals = {
    tbDr: sum('tbDr'),
    tbCr: sum('tbCr'),
    adjDr: sum('adjDr'),
    adjCr: sum('adjCr'),
    plDr: sum('plDr'),
    plCr: sum('plCr'),
    bsDr: sum('bsDr'),
    bsCr: sum('bsCr'),
  };
  return { rows, totals, netIncome: totals.plCr - totals.plDr };
}
