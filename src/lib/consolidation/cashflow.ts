import type { AccountBook } from '../content/accounts.ts';
import type { ConsolidationCase } from '../content/schema.ts';
import { buildIndirectCashFlow, isCash, type CashFlowStatement } from '../cashflow/indirect.ts';
import {
  consolidate,
  NCI_ACCOUNT,
  readTrialBalance,
  type ConsolidationResult,
} from './consolidate.ts';

/**
 * 連結キャッシュ・フロー計算書（簡便法: 期首と期末の連結貸借対照表と、連結損益計算書から作る）。
 * 期首の連結貸借対照表がない事例では null。
 */
export function consolidatedCashFlow(
  c: ConsolidationCase,
  book: AccountBook,
  result: ConsolidationResult = consolidate(c, book),
): CashFlowStatement | null {
  if (!c.opening) return null;
  const opening = readTrialBalance(c.opening.balanceSheet, book);
  const closing = new Map<string, number>();
  for (const r of result.rows) {
    const el = book.find(r.account)?.element;
    if (el === 'revenue' || el === 'expense' || el === 'other') continue;
    closing.set(r.account, r.consolidated);
  }
  // 期末の利益剰余金には、親会社株主に帰属する当期純利益を加える（決算の締めのあとの貸借対照表にする）
  closing.set('利益剰余金', (closing.get('利益剰余金') ?? 0) - result.parentNetIncome);
  // 非支配株主持分は、修正仕訳で当期の利益の配分を含んでいる
  const foreign = result.entities.some((r) => r.entity.currency !== 'JPY');
  return buildIndirectCashFlow({
    opening,
    closing,
    netIncome: result.netIncome,
    nciProfit: result.nciProfit,
    book,
    translation: foreign ? translationEffects(c, book, result) : undefined,
  });
}

/**
 * 在外子会社の資産・負債のうち、レートが変わったことによる円の増減（借方が正）。
 * 期中の増減は期中平均レート（AR）で換算したとみなし、
 * 期末（現地通貨 × CR）− 期首（現地通貨 × 前期末のレート）− 増減 × AR を換算の影響とする。
 * 現金の分は「現金及び現金同等物に係る換算差額」に残るので、ここには含めない。
 */
export function translationEffects(
  c: ConsolidationCase,
  book: AccountBook,
  result: ConsolidationResult,
): { effects: Map<string, number>; nciShare: number } {
  const effects = new Map<string, number>();
  for (const r of result.entities) {
    const { entity } = r;
    if (entity.currency === 'JPY' || !entity.rates) continue;
    const open = readTrialBalance(entity.opening?.balanceSheet ?? '', book);
    const close = new Map(
      r.lines.filter((l) => l.rateType === 'CR').map((l) => [l.account, l.local]),
    );
    const openRate = entity.opening?.rate ?? entity.rates.CR;
    for (const name of new Set([...open.keys(), ...close.keys()])) {
      const el = book.find(name)?.element;
      if ((el !== 'asset' && el !== 'liability') || isCash(name)) continue;
      if (entity.historical[name] !== undefined) continue;
      const o = open.get(name) ?? 0;
      const cl = close.get(name) ?? 0;
      const e =
        Math.round(cl * entity.rates.CR) -
        Math.round(o * openRate) -
        Math.round((cl - o) * entity.rates.AR);
      if (e !== 0) effects.set(name, (effects.get(name) ?? 0) + e);
    }
  }
  // 換算差額の配分の修正仕訳で、非支配株主持分が動いた分（当期の配分とみなす）
  const nciRow = result.rows.find((r) => r.account === NCI_ACCOUNT);
  const nciShare = c.eliminations
    .filter((e) => e.category === 'translation')
    .reduce((s, e) => s + (nciRow?.byElimination[e.id] ?? 0), 0);
  return { effects, nciShare };
}
