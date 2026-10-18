import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildContent } from './content';
import { AccountBook } from '../src/lib/content/accounts';
import type { ConsolidationCase, ContentIndex } from '../src/lib/content/schema';
import { consolidate, translateEntity } from '../src/lib/consolidation/consolidate';

const { files } = buildContent(path.resolve(import.meta.dirname, '..'));
const index = JSON.parse(files.get('content/index.json')!) as ContentIndex;
const book = new AccountBook(index.accounts);
const load = (id: string) =>
  JSON.parse(files.get(`content/consolidation/${id}.json`)!) as ConsolidationCase;

describe('consolidate（国内子会社 80%）', () => {
  const c = load('domestic-80');
  const r = consolidate(c, book);
  const row = (a: string) => r.rows.find((x) => x.account === a);

  it('連結の当期純利益と、非支配株主・親会社株主への配分', () => {
    // P 200 + S 100 − のれん償却 10 − 未実現利益 10 ＝ 280、うち非支配株主 20
    expect(r.netIncome).toBe(280);
    expect(r.nciProfit).toBe(20);
    expect(r.parentNetIncome).toBe(260);
  });

  it('子会社株式は消え、のれん・非支配株主持分が残る', () => {
    expect(row('子会社株式')?.consolidated).toBe(0);
    expect(row('のれん')?.consolidated).toBe(190);
    expect(row('非支配株主持分')?.consolidated).toBe(-220);
    expect(row('売掛金')?.byElimination).toEqual({ balances: 100 * -1 });
  });

  it('連結貸借対照表の貸借が一致する', () => {
    const s = r.statements;
    expect(r.trialBalance.drTotal).toBe(r.trialBalance.crTotal);
    expect(s.totalAssets).toBe(s.totalLiabilities + s.totalEquity + s.netIncome);
  });

  it('修正仕訳を外すと、その分だけ変わる', () => {
    const without = consolidate(
      c,
      book,
      new Set(['capital', 'goodwill', 'nci-profit', 'sales', 'balances']),
    );
    expect(without.netIncome).toBe(290);
  });
});

describe('translateEntity', () => {
  it('円の会社はそのまま', () => {
    const r = translateEntity(load('domestic-80').entities[0], book);
    expect(r.translationAdjustment).toBe(0);
    expect(r.lines.every((l) => l.rate === 1)).toBe(true);
  });
});
