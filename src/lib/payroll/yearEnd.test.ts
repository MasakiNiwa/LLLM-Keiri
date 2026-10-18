import { describe, expect, it } from 'vitest';
import { rulesFor, TAX_YEARS } from './taxYears';
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

describe('年末調整（2026 年分）', () => {
  const r26 = rulesFor(2026);
  it('給与所得控除（収入 220 万円未満は 74 万円を引く）', () => {
    expect(employmentIncome(600_000, r26)).toBe(0);
    expect(employmentIncome(1_500_000, r26)).toBe(760_000);
    expect(employmentIncome(2_000_000, r26)).toBe(1_260_000);
    // 220 万円で「30% ＋ 8 万円」とつながる
    expect(employmentIncome(2_200_000, r26)).toBe(1_460_000);
    expect(employmentIncome(5_000_000, r26)).toBe(3_560_000);
  });
  it('基礎控除', () => {
    expect(basicDeduction(1_000_000, r26)).toBe(1_040_000);
    expect(basicDeduction(4_890_000, r26)).toBe(1_040_000);
    expect(basicDeduction(5_000_000, r26)).toBe(670_000);
    expect(basicDeduction(10_000_000, r26)).toBe(620_000);
    expect(basicDeduction(26_000_000, r26)).toBe(0);
  });
  it('同じ人の年税額は 2025 年分より少ない', () => {
    const input = {
      salary: 5_000_000,
      withheld: 120_000,
      socialInsurance: 720_000,
      insurance: 40_000,
      spouse: 0,
      dependents: 1,
      specificDependents: 0,
      elderlyDependents: 0,
      housingLoan: 0,
    };
    const r = yearEndAdjustment({ ...input, year: 2026 });
    // 3,560,000 − （720,000 ＋ 40,000 ＋ 380,000 ＋ 1,040,000）＝ 1,380,000
    expect(r.taxable).toBe(1_380_000);
    expect(r.computedTax).toBe(69_000);
    expect(r.annualTax).toBe(70_400);
    expect(r.annualTax).toBeLessThan(yearEndAdjustment(input).annualTax);
  });
});

describe('年分のデータ', () => {
  it('年分の順に並び、基礎控除の区分は増えていく', () => {
    TAX_YEARS.forEach((r, i) => {
      if (i > 0) expect(r.year).toBeGreaterThan(TAX_YEARS[i - 1].year);
      r.basic.forEach(([limit], j) => {
        if (j > 0) expect(limit).toBeGreaterThan(r.basic[j - 1][0]);
      });
    });
  });
  it('給与所得控除の最低額の範囲は、別表第五の方式とつながる', () => {
    for (const r of TAX_YEARS) {
      const { flatUntil, minimum } = r.employment;
      expect(flatUntil * 0.3 + 80_000).toBe(minimum);
    }
  });
  it('無い年分は最も近い年分', () => {
    expect(rulesFor(2020).year).toBe(TAX_YEARS[0].year);
    expect(rulesFor(2099).year).toBe(TAX_YEARS[TAX_YEARS.length - 1].year);
  });
});
