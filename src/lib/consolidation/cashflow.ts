import type { AccountBook } from '../content/accounts.ts';
import type { ConsolidationCase } from '../content/schema.ts';
import { buildIndirectCashFlow, type CashFlowStatement } from '../cashflow/indirect.ts';
import { consolidate, readTrialBalance, type ConsolidationResult } from './consolidate.ts';

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
  return buildIndirectCashFlow({
    opening,
    closing,
    netIncome: result.netIncome,
    nciProfit: result.nciProfit,
    book,
  });
}
