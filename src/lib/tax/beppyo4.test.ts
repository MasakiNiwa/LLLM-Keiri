import { describe, expect, it } from 'vitest';
import { beppyo4 } from './beppyo4';

describe('別表四', () => {
  const r = beppyo4({
    netIncome: 10_000_000,
    dividends: 2_000_000,
    rate: 23.2,
    items: [
      {
        label: '損金経理をした納税充当金',
        amount: 4_000_000,
        kind: 'add',
        disposition: 'retained',
      },
      { label: '交際費等の損金不算入額', amount: 500_000, kind: 'add', disposition: 'outflow' },
      { label: '減価償却の償却超過額', amount: 300_000, kind: 'add', disposition: 'retained' },
      {
        label: '納税充当金から支出した事業税等',
        amount: 600_000,
        kind: 'deduct',
        disposition: 'retained',
      },
      {
        label: '受取配当等の益金不算入額',
        amount: 200_000,
        kind: 'deduct',
        disposition: 'outflow',
      },
    ],
  });
  it('所得金額 ＝ 当期利益 ＋ 加算 − 減算、総額 ＝ 留保 ＋ 社外流出', () => {
    expect(r.income.total).toBe(10_000_000 + 4_800_000 - 800_000);
    expect(r.income.retained).toBe(8_000_000 + 4_300_000 - 600_000);
    expect(r.income.outflow).toBe(2_000_000 + 500_000 - 200_000);
    expect(r.income.retained + r.income.outflow).toBe(r.income.total);
  });
  it('課税標準は 1,000 円未満、税額は 100 円未満を切り捨て', () => {
    const s = beppyo4({ netIncome: 1_234_567, dividends: 0, rate: 23.2, items: [] });
    expect(s.taxableIncome).toBe(1_234_000);
    expect(s.tax).toBe(286_200); // 286,288 → 286,200
  });
});
