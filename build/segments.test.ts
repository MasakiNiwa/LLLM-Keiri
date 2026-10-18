import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccountBook } from '../src/lib/content/accounts';
import type { ConsolidationCase, ContentIndex } from '../src/lib/content/schema';
import { consolidate } from '../src/lib/consolidation/consolidate';
import { segmentReport } from '../src/lib/consolidation/segments';
import { buildContent } from './content';

const { files } = buildContent(path.resolve(import.meta.dirname, '..'));
const index = JSON.parse(files.get('content/index.json')!) as ContentIndex;
const book = new AccountBook(index.accounts);
const load = (id: string) =>
  JSON.parse(files.get(`content/consolidation/${id}.json`)!) as ConsolidationCase;

describe('セグメント情報（製造と小売）', () => {
  const c = load('segments-domestic');
  const result = consolidate(c, book);
  const r = segmentReport(c, book, result)!;
  const seg = (name: string) => r.segments.find((s) => s.name === name)!;

  it('セグメントごとの金額', () => {
    expect(seg('小売事業').values).toEqual({ sales: 200000, profit: 10000, assets: 200000 });
    expect(seg('製造事業').values).toEqual({ sales: 110000, profit: 20000, assets: 88000 });
  });

  it('セグメント間の売上高は、売り手（製造事業）に出る', () => {
    expect(seg('製造事業').intersegmentSales).toBe(60000);
    expect(seg('小売事業').intersegmentSales).toBe(0);
  });

  it('セグメントの合計 ＋ 調整額 ＝ 連結', () => {
    expect(r.adjustmentTotals).toEqual({ sales: -60000, profit: -3000, assets: -61000 });
    expect(r.consolidated).toEqual({ sales: 250000, profit: 27000, assets: 227000 });
    expect(r.consolidated.assets).toBe(result.statements.totalAssets);
  });

  it('修正仕訳を外すと、調整額から消える', () => {
    const enabled = new Set(['capital', 'sales', 'balances']);
    const r2 = segmentReport(c, book, consolidate(c, book, enabled), enabled)!;
    expect(r2.adjustmentTotals.profit).toBe(0);
  });

  it('セグメントを書いていない事例では null', () => {
    const d = load('domestic-80');
    expect(segmentReport(d, book, consolidate(d, book))).toBeNull();
  });
});
