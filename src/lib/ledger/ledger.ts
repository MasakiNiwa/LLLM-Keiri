import type { AccountBook } from '../content/accounts.ts';
import { ELEMENTS, type Account, type Element } from '../content/schema.ts';
import type { JournalLine, Side } from '../journal/types.ts';

/** 帳簿に記録した仕訳 */
export interface LedgerEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** 摘要 */
  memo: string;
  lines: JournalLine[];
}

/** 勘定に転記した 1 行 */
export interface Posting {
  entryId: string;
  date: string;
  memo: string;
  /** 相手の勘定科目（相手が 2 つ以上なら「諸口」） */
  counterpart: string;
  amount: number;
}

export interface AccountLedger {
  account: string;
  element: Element;
  contra: boolean;
  debits: Posting[];
  credits: Posting[];
  drTotal: number;
  crTotal: number;
  /** 残高（借方 − 貸方。マイナスなら貸方残高） */
  balance: number;
}

const ELEMENT_ORDER = new Map(ELEMENTS.map((e, i) => [e, i]));

/**
 * 仕訳を勘定科目ごとに転記して、総勘定元帳を作る（日付順・入力順）。
 * 並びは 資産 → 負債 → 純資産 → 収益 → 費用 → その他、同じ区分の中は勘定科目のマスタの順。
 */
export function buildLedger(entries: LedgerEntry[], book: AccountBook): AccountLedger[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<string, AccountLedger>();
  const get = (name: string): AccountLedger => {
    const acc = book.find(name);
    const key = acc?.name ?? name;
    let l = map.get(key);
    if (!l) {
      l = {
        account: key,
        element: acc?.element ?? 'other',
        contra: acc?.contra ?? false,
        debits: [],
        credits: [],
        drTotal: 0,
        crTotal: 0,
        balance: 0,
      };
      map.set(key, l);
    }
    return l;
  };
  for (const e of sorted) {
    const names = (side: Side) => [
      ...new Set(e.lines.filter((l) => l.side === side).map((l) => book.canonical(l.account))),
    ];
    const dr = names('dr');
    const cr = names('cr');
    for (const line of e.lines) {
      const l = get(line.account);
      const others = line.side === 'dr' ? cr : dr;
      const p: Posting = {
        entryId: e.id,
        date: e.date,
        memo: e.memo,
        counterpart: others.length === 1 ? others[0] : '諸口',
        amount: line.amount,
      };
      if (line.side === 'dr') {
        l.debits.push(p);
        l.drTotal += line.amount;
      } else {
        l.credits.push(p);
        l.crTotal += line.amount;
      }
    }
  }
  const order = new Map(book.accounts.map((a, i) => [a.name, i]));
  return [...map.values()]
    .map((l) => ({ ...l, balance: l.drTotal - l.crTotal }))
    .sort(
      (a, b) =>
        (ELEMENT_ORDER.get(a.element) ?? 9) - (ELEMENT_ORDER.get(b.element) ?? 9) ||
        (order.get(a.account) ?? 1e9) - (order.get(b.account) ?? 1e9),
    );
}

export interface TrialBalance {
  rows: AccountLedger[];
  drTotal: number;
  crTotal: number;
  /** 残高の借方合計・貸方合計 */
  drBalance: number;
  crBalance: number;
}

/** 合計残高試算表 */
export function trialBalance(ledger: AccountLedger[]): TrialBalance {
  let drTotal = 0;
  let crTotal = 0;
  let drBalance = 0;
  let crBalance = 0;
  for (const l of ledger) {
    drTotal += l.drTotal;
    crTotal += l.crTotal;
    if (l.balance > 0) drBalance += l.balance;
    else crBalance -= l.balance;
  }
  return { rows: ledger, drTotal, crTotal, drBalance, crBalance };
}

export interface StatementLine {
  account: string;
  /** 表示する金額（評価勘定はマイナス） */
  amount: number;
  contra: boolean;
}

export interface Statements {
  assets: StatementLine[];
  liabilities: StatementLine[];
  equity: StatementLine[];
  revenues: StatementLine[];
  expenses: StatementLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenues: number;
  totalExpenses: number;
  /** 当期純利益（マイナスなら純損失） */
  netIncome: number;
  /** 区分が「その他」で残高が残っている科目（現金過不足など。決算までに整理する） */
  unsettled: StatementLine[];
}

/**
 * 残高から貸借対照表と損益計算書を作る（決算整理をしたあとの残高を想定）。
 * 当期純利益は、貸借対照表では純資産に加える。
 */
export function buildStatements(ledger: AccountLedger[]): Statements {
  const pick = (el: Element, sign: 1 | -1) =>
    ledger
      .filter((l) => l.element === el && l.balance !== 0)
      .map((l) => ({ account: l.account, amount: sign * l.balance, contra: l.contra }));
  const sum = (xs: StatementLine[]) => xs.reduce((s, x) => s + x.amount, 0);
  const assets = pick('asset', 1);
  const liabilities = pick('liability', -1);
  const equity = pick('equity', -1);
  const revenues = pick('revenue', -1);
  const expenses = pick('expense', 1);
  const unsettled = pick('other', 1);
  const totalRevenues = sum(revenues);
  const totalExpenses = sum(expenses);
  return {
    assets,
    liabilities,
    equity,
    revenues,
    expenses,
    totalAssets: sum(assets),
    totalLiabilities: sum(liabilities),
    totalEquity: sum(equity),
    totalRevenues,
    totalExpenses,
    netIncome: totalRevenues - totalExpenses,
    unsettled,
  };
}

/** 勘定科目のふつうの残高の側（資産・費用は借方、ほかは貸方。評価勘定は逆） */
export function normalSide(a: Pick<Account, 'element' | 'contra'>): Side {
  const dr = a.element === 'asset' || a.element === 'expense' || a.element === 'other';
  return dr !== a.contra ? 'dr' : 'cr';
}
