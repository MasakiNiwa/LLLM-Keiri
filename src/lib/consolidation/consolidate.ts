/**
 * 連結の計算（プログラムが行う。AI には計算させない）。
 *
 * 1. 各社の残高試算表を読む（借方残高を正、貸方残高を負で持つ）
 * 2. 在外子会社は円に換算する（資産・負債は決算日レート CR、資本は取得時・発生時のレート、
 *    収益・費用は期中平均レート AR。差額は為替換算調整勘定）
 * 3. 各社を合算し、連結修正仕訳を加えて、連結の試算表・財務諸表を作る
 * 4. 連結の金額ごとに「どの会社の・どの修正仕訳の」金額かの内訳を持つ（ドリルダウン用）
 */
import type { AccountBook } from '../content/accounts.ts';
import type { ConsolidationCase, Entity, Rates } from '../content/schema.ts';
import { ELEMENTS, type Element } from '../content/schema.ts';
import { parseShiwake } from '../journal/parse.ts';
import type { JournalLine } from '../journal/types.ts';
import {
  buildLedger,
  buildStatements,
  trialBalance,
  type AccountLedger,
  type LedgerEntry,
  type Statements,
  type TrialBalance,
} from '../ledger/ledger.ts';

/** 換算差額の科目 */
export const TRANSLATION_ACCOUNT = '為替換算調整勘定';
/** 連結損益計算書で、当期純利益から差し引く科目 */
export const NCI_PROFIT_ACCOUNT = '非支配株主に帰属する当期純利益';
/** 非支配株主持分 */
export const NCI_ACCOUNT = '非支配株主持分';

export type RateType = keyof Rates | 'HIST' | 'JPY';

export interface TranslatedLine {
  account: string;
  /** 現地通貨の残高（借方が正） */
  local: number;
  rateType: RateType;
  rate: number;
  /** 円の残高（借方が正） */
  jpy: number;
}

export interface EntityResult {
  entity: Entity;
  lines: TranslatedLine[];
  /** 円の残高（借方が正）。換算差額を含む */
  balances: Map<string, number>;
  /** 換算差額（借方が正。在外子会社のときだけ） */
  translationAdjustment: number;
}

/** 試算表（仕訳の書き方）を、科目ごとの残高（借方が正）にする */
export function readTrialBalance(text: string, book: AccountBook): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of parseShiwake(text).entries) {
    for (const l of e.lines) {
      const name = book.canonical(l.account);
      m.set(name, (m.get(name) ?? 0) + (l.side === 'dr' ? l.amount : -l.amount));
    }
  }
  return m;
}

/** 区分から決まる換算レートの種類 */
export function rateTypeFor(element: Element): keyof Rates {
  if (element === 'equity') return 'HR';
  if (element === 'revenue' || element === 'expense') return 'AR';
  return 'CR';
}

/** 1 社の試算表を読み、在外子会社なら円に換算する */
export function translateEntity(entity: Entity, book: AccountBook): EntityResult {
  const local = readTrialBalance(entity.trialBalance, book);
  const lines: TranslatedLine[] = [];
  for (const [account, amount] of local) {
    if (entity.currency === 'JPY' || !entity.rates) {
      lines.push({ account, local: amount, rateType: 'JPY', rate: 1, jpy: amount });
      continue;
    }
    const hist = entity.historical[account];
    const element = book.find(account)?.element ?? 'other';
    const rateType: RateType = hist !== undefined ? 'HIST' : rateTypeFor(element);
    const rate = hist ?? entity.rates[rateType as keyof Rates];
    lines.push({ account, local: amount, rateType, rate, jpy: Math.round(amount * rate) });
  }
  const balances = new Map(lines.map((l) => [l.account, l.jpy]));
  // 換算後の借方・貸方の差は、為替換算調整勘定にする（円の試算表の貸借を合わせる）
  const diff = lines.reduce((s, l) => s + l.jpy, 0);
  const translationAdjustment = entity.currency === 'JPY' ? 0 : -diff;
  if (translationAdjustment !== 0) {
    balances.set(
      TRANSLATION_ACCOUNT,
      (balances.get(TRANSLATION_ACCOUNT) ?? 0) + translationAdjustment,
    );
  }
  return { entity, lines, balances, translationAdjustment };
}

export interface ConsolidationRow {
  account: string;
  element: Element;
  /** 会社ごとの円の残高（借方が正） */
  byEntity: Record<string, number>;
  /** 合算（修正前） */
  combined: number;
  /** 修正仕訳ごとの金額（借方が正） */
  byElimination: Record<string, number>;
  /** 連結の残高（借方が正） */
  consolidated: number;
}

export interface ConsolidationResult {
  entities: EntityResult[];
  rows: ConsolidationRow[];
  /** 連結の元帳・試算表・財務諸表（帳簿と同じ計算） */
  ledger: AccountLedger[];
  trialBalance: TrialBalance;
  statements: Statements;
  /** 非支配株主に帰属する当期純利益 */
  nciProfit: number;
  /** 当期純利益（非支配株主に帰属する分を差し引く前） */
  netIncome: number;
  /** 親会社株主に帰属する当期純利益 */
  parentNetIncome: number;
}

function toLines(balances: Map<string, number>): JournalLine[] {
  return [...balances]
    .filter(([, v]) => v !== 0)
    .map(([account, v]) => ({ account, side: v > 0 ? 'dr' : 'cr', amount: Math.abs(v) }));
}

/**
 * 連結する。enabled に入っている修正仕訳だけを使う（入れたり外したりして違いを見られるように）。
 */
export function consolidate(
  c: ConsolidationCase,
  book: AccountBook,
  enabled: ReadonlySet<string> = new Set(c.eliminations.map((e) => e.id)),
): ConsolidationResult {
  const entities = c.entities.map((e) => translateEntity(e, book));
  const elims = c.eliminations
    .filter((e) => enabled.has(e.id))
    .map((e) => ({ e, balances: readTrialBalance(e.shiwake, book) }));

  const accounts = new Set<string>();
  for (const r of entities) for (const k of r.balances.keys()) accounts.add(k);
  for (const { balances } of elims) for (const k of balances.keys()) accounts.add(k);

  const order = new Map(book.accounts.map((a, i) => [a.name, i]));
  const elementOrder = new Map(ELEMENTS.map((e, i) => [e, i]));
  const rows: ConsolidationRow[] = [...accounts].map((account) => {
    const byEntity: Record<string, number> = {};
    for (const r of entities) byEntity[r.entity.id] = r.balances.get(account) ?? 0;
    const byElimination: Record<string, number> = {};
    for (const { e, balances } of elims) {
      const v = balances.get(account);
      if (v) byElimination[e.id] = v;
    }
    const combined = Object.values(byEntity).reduce((s, v) => s + v, 0);
    const consolidated = combined + Object.values(byElimination).reduce((s, v) => s + v, 0);
    return {
      account,
      element: book.find(account)?.element ?? 'other',
      byEntity,
      combined,
      byElimination,
      consolidated,
    };
  });
  rows.sort(
    (a, b) =>
      (elementOrder.get(a.element) ?? 9) - (elementOrder.get(b.element) ?? 9) ||
      (order.get(a.account) ?? 1e9) - (order.get(b.account) ?? 1e9),
  );

  // 連結の財務諸表は、各社の残高と修正仕訳を 1 つの帳簿に入れて、帳簿と同じ計算で作る
  const entries: LedgerEntry[] = [
    ...entities.map((r) => ({
      id: `entity:${r.entity.id}`,
      date: c.asOf,
      memo: r.entity.name,
      lines: toLines(r.balances),
    })),
    ...elims.map(({ e, balances }) => ({
      id: `elim:${e.id}`,
      date: c.asOf,
      memo: e.title,
      lines: toLines(balances),
    })),
  ];
  const ledger = buildLedger(entries, book);
  const statements = buildStatements(ledger);
  const nciProfit = ledger.find((l) => l.account === NCI_PROFIT_ACCOUNT)?.balance ?? 0;
  return {
    entities,
    rows,
    ledger,
    trialBalance: trialBalance(ledger),
    statements,
    nciProfit,
    netIncome: statements.netIncome + nciProfit,
    parentNetIncome: statements.netIncome,
  };
}

export interface TranslationGroup {
  label: string;
  rateType: RateType;
  rate: number;
  /** 現地通貨（借方が正） */
  local: number;
  /** 円（借方が正） */
  jpy: number;
}

/**
 * 換算差額の内訳（ドリルダウン用）: 使ったレートごとに、現地通貨と円の合計を出す。
 * 各グループの円の合計を足すと、為替換算調整勘定と逆の符号の金額になる（貸借が合わない分）。
 */
export function translationGroups(r: EntityResult, book: AccountBook): TranslationGroup[] {
  const groups = new Map<string, TranslationGroup>();
  for (const l of r.lines) {
    const element = book.find(l.account)?.element ?? 'other';
    const label =
      l.rateType === 'CR'
        ? '資産・負債'
        : l.rateType === 'AR'
          ? '収益・費用（当期純利益）'
          : element === 'equity'
            ? '資本'
            : l.account;
    const key = `${label}:${l.rate}`;
    const g = groups.get(key) ?? { label, rateType: l.rateType, rate: l.rate, local: 0, jpy: 0 };
    g.local += l.local;
    g.jpy += l.jpy;
    groups.set(key, g);
  }
  return [...groups.values()];
}
