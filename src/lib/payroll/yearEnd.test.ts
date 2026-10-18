import { describe, expect, it } from 'vitest';
import { basicDeduction, employmentIncome, incomeTaxByTable, yearEndAdjustment } from './yearEnd';

describe('年末調整（2025 年分）', () => {
  it('給与所得控除', () => {
    expect(employmentIncome(1_500_000)).toBe(850_000);
    expect(employmentIncome(600_000)).toBe(0);
    // 5,000,000 → A ＝ 5,000,000、控除 1,440,000
    expect(employmentIncome(5_000_000)).toBe(3_560_000);
    // 3,001,999 → A ＝ 3,000,000、控除 980,000
    expect(employmentIncome(3_001_999)).toBe(2_020_000);
    expect(employmentIncome(8_000_000)).toBe(6_100_000);
    expect(employmentIncome(10_000_000)).toBe(8_050_000);
  });
  it('基礎控除', () => {
    expect(basicDeduction(1_000_000)).toBe(950_000);
    expect(basicDeduction(3_560_000)).toBe(680_000);
    expect(basicDeduction(10_000_000)).toBe(580_000);
  });
  it('速算表', () => {
    expect(incomeTaxByTable(1_000_000)).toBe(50_000);
    expect(incomeTaxByTable(3_000_000)).toBe(202_500);
  });
  it('年税額と過不足', () => {
    const r = yearEndAdjustment({
      salary: 5_000_000,
      withheld: 120_000,
      socialInsurance: 720_000,
      insurance: 40_000,
      spouse: 0,
      dependents: 1,
      specificDependents: 0,
      elderlyDependents: 0,
      housingLoan: 0,
    });
    // 3,560,000 − （720,000 ＋ 40,000 ＋ 380,000 ＋ 680,000）＝ 1,740,000
    expect(r.taxable).toBe(1_740_000);
    expect(r.computedTax).toBe(87_000);
    // 87,000 × 1.021 ＝ 88,827 → 88,800
    expect(r.annualTax).toBe(88_800);
    expect(r.difference).toBe(31_200);
  });
});
