import { describe, expect, it } from 'vitest';
import { allocatePoints, impairment, leaseSchedule } from './standards';

describe('ポイントへの配分', () => {
  it('独立販売価格の比で配分する', () => {
    const r = allocatePoints({ price: 10000, points: 100, usageRate: 100 });
    expect(r.contractLiability).toBe(99);
    expect(r.revenue).toBe(9901);
  });
  it('使用見込み率を反映する', () => {
    const r = allocatePoints({ price: 100000, points: 5000, usageRate: 80 });
    expect(r.pointsValue).toBe(4000);
    // 100,000 × 4,000 / 104,000 ＝ 3,846.15…
    expect(r.contractLiability).toBe(3846);
    expect(r.revenue + r.contractLiability).toBe(100000);
  });
});

describe('減損', () => {
  it('割引前将来 CF が帳簿価額以上なら認識しない', () => {
    expect(
      impairment({
        bookValue: 1000,
        undiscounted: 1000,
        netSellingPrice: 500,
        valueInUse: 600,
        account: '建物',
      }).recognized,
    ).toBe(false);
  });
  it('回収可能価額は正味売却価額と使用価値の高いほう', () => {
    const r = impairment({
      bookValue: 5000000,
      undiscounted: 4000000,
      netSellingPrice: 2800000,
      valueInUse: 3000000,
      account: '建物',
    });
    expect(r.recoverable).toBe(3000000);
    expect(r.loss).toBe(2000000);
  });
});

describe('新しいリース会計基準', () => {
  const r = leaseSchedule({ payment: 100000, years: 5, rate: 3 });
  it('現在価値と返済表', () => {
    expect(r.presentValue).toBe(457971);
    expect(r.schedule[0].interest).toBe(13739);
    expect(r.schedule.at(-1)!.closing).toBe(0);
    expect(r.schedule.reduce((s, x) => s + x.principal, 0)).toBe(r.presentValue);
  });
  it('割引率 0 ならリース料の合計', () => {
    expect(leaseSchedule({ payment: 1000, years: 3, rate: 0 }).presentValue).toBe(3000);
  });
});
