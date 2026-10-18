import { describe, expect, it } from 'vitest';
import { cashPlan, workingCapital } from './cash';

describe('運転資金と CCC', () => {
  it('回転日数と必要運転資金', () => {
    const r = workingCapital({
      sales: 36_500_000,
      cogs: 25_550_000,
      receivables: 6_000_000,
      inventory: 2_100_000,
      payables: 2_800_000,
    });
    expect(r.dso).toBe(60);
    expect(r.dio).toBe(30);
    expect(r.dpo).toBe(40);
    expect(r.ccc).toBe(50);
    expect(r.workingCapital).toBe(5_300_000);
    expect(r.increaseIfGrow10).toBe(530_000);
  });
});

describe('資金繰り表', () => {
  const base = {
    months: 6,
    openingCash: 3_000_000,
    sales: 10_000_000,
    growth: 0,
    cashSalesRate: 0,
    collectionLag: 2,
    costRate: 60,
    paymentLag: 1,
    expenses: 3_000_000,
    loanMonth: 0,
    loanAmount: 0,
    repayment: 0,
    minimumCash: 1_000_000,
  };
  it('売上が変わらなければ、毎月の利益の分だけ増える', () => {
    const r = cashPlan(base);
    expect(r.rows[0].receipts).toBe(10_000_000);
    expect(r.rows[0].payments).toBe(9_000_000);
    expect(r.rows[5].closing).toBe(3_000_000 + 6 * 1_000_000);
    expect(r.firstShortMonth).toBeNull();
  });
  it('売上が急に伸びると、黒字なのにお金が足りなくなる（黒字倒産の危険）', () => {
    const r = cashPlan({ ...base, costRate: 80, expenses: 1_500_000, growth: 20 });
    expect(r.totalProfit).toBeGreaterThan(0);
    expect(r.firstShortMonth).not.toBeNull();
  });
  it('借入れと返済', () => {
    const r = cashPlan({ ...base, loanMonth: 2, loanAmount: 2_000_000, repayment: 100_000 });
    expect(r.rows[1].financing).toBe(2_000_000);
    expect(r.rows[2].financing).toBe(-100_000);
    expect(r.rows[0].financing).toBe(0);
  });
});
