import { describe, expect, it } from 'vitest';
import { monthlyPay, roundHalfDown } from './monthly';

describe('給与計算', () => {
  it('50 銭以下切り捨て・50 銭超切り上げ', () => {
    expect(roundHalfDown(100.5)).toBe(100);
    expect(roundHalfDown(100.51)).toBe(101);
    expect(roundHalfDown(100.49)).toBe(100);
  });
  const r = monthlyPay({
    basePay: 300000,
    allowances: 20000,
    commute: 15000,
    monthlyHours: 160,
    overtimeHours: 10,
    overtimeRate: 25,
    standardMonthly: 340000,
    healthRate: 10,
    careRate: 0,
    pensionRate: 18.3,
    employmentRate: 0.55,
    incomeTax: 8000,
    residentTax: 15000,
  });
  it('割増賃金と総支給', () => {
    // 320,000 ÷ 160 ＝ 2,000 円 × 1.25 × 10 時間
    expect(r.overtimePay).toBe(25000);
    expect(r.gross).toBe(360000);
  });
  it('社会保険料と雇用保険料', () => {
    expect(r.health).toBe(17000);
    expect(r.pension).toBe(31110);
    // 360,000 × 0.55% ＝ 1,980
    expect(r.employment).toBe(1980);
    expect(r.taxBase).toBe(345000 - 50090);
    expect(r.netPay).toBe(360000 - 50090 - 8000 - 15000);
  });
  it('仕訳の貸借', () => {
    const sum = (s: string) =>
      r.payday.lines.filter((l) => l.side === s).reduce((a, l) => a + l.amount, 0);
    expect(sum('dr')).toBe(sum('cr'));
  });
});
