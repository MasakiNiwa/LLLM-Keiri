import { describe, expect, it } from 'vitest';
import { dupont, salesVariance } from './management';

describe('売上高の予実差異', () => {
  it('価格差異と数量差異に分ける', () => {
    const r = salesVariance({
      budgetPrice: 1_000,
      budgetQuantity: 10_000,
      actualPrice: 950,
      actualQuantity: 11_000,
    });
    expect(r.budgetSales).toBe(10_000_000);
    expect(r.actualSales).toBe(10_450_000);
    expect(r.total).toBe(450_000);
    expect(r.price).toBe(-550_000);
    expect(r.quantity).toBe(1_000_000);
  });
  it('負の数は受け付けない', () => {
    expect(
      salesVariance({ budgetPrice: -1, budgetQuantity: 1, actualPrice: 1, actualQuantity: 1 })
        .error,
    ).toBeTruthy();
  });
});

describe('ROE のデュポン分解', () => {
  it('3 つの要素の積が ROE になる', () => {
    const r = dupont({
      netIncome: 40_000_000,
      sales: 800_000_000,
      totalAssets: 1_000_000_000,
      equity: 400_000_000,
    });
    expect(r.margin).toBe(5);
    expect(r.turnover).toBe(0.8);
    expect(r.leverage).toBe(2.5);
    expect(r.roe).toBe(10);
    expect(r.roa).toBe(4);
    expect(r.equityRatio).toBe(40);
    expect((r.margin * r.turnover * r.leverage).toFixed(2)).toBe('10.00');
  });
  it('自己資本が 0 以下ならエラー', () => {
    expect(dupont({ netIncome: 1, sales: 1, totalAssets: 1, equity: 0 }).error).toBeTruthy();
  });
});
