import { describe, expect, it } from 'vitest';
import { TAX_YEARS } from './taxYears';
import { monthlyWithholding } from './withholding';

describe('電算機計算の特例（月額表の甲欄）', () => {
  it('2025 年分: 社会保険料等控除後 260,000 円・扶養 0 人', () => {
    const r = monthlyWithholding(260_000, 0, 2025);
    // 給与所得控除 260,000 × 30% ＋ 6,667 ＝ 84,667、基礎控除 40,000
    expect(r.employmentDeduction).toBe(84_667);
    expect(r.basicDeduction).toBe(40_000);
    expect(r.taxable).toBe(135_333);
    // 135,333 × 5.105% ＝ 6,908.7 → 6,910
    expect(r.tax).toBe(6_910);
  });
  it('2026 年分は基礎控除 48,334 円・給与所得控除の最低 54,167 円', () => {
    const r = monthlyWithholding(260_000, 0, 2026);
    expect(r.basicDeduction).toBe(48_334);
    expect(r.taxable).toBe(126_999);
    expect(r.tax).toBe(6_480);
    expect(monthlyWithholding(150_000, 0, 2026).employmentDeduction).toBe(54_167);
  });
  it('扶養親族等 1 人ごとに 31,667 円を引く', () => {
    const r = monthlyWithholding(300_000, 2, 2026);
    // 300,000 × 20% ＋ 36,667 ＝ 96,667
    expect(r.employmentDeduction).toBe(96_667);
    expect(r.taxable).toBe(300_000 - 96_667 - 48_334 - 63_334);
  });
  it('控除が給与を超えると 0 円', () => {
    expect(monthlyWithholding(80_000, 0, 2026).tax).toBe(0);
  });
  it('給与所得控除の区分は年分ごとにつながる', () => {
    for (const y of TAX_YEARS) {
      const steps = y.monthly.employment;
      for (let i = 1; i < steps.length; i++) {
        const [prevLimit, pr, pp] = steps[i - 1];
        const [, rate, plus] = steps[i];
        const before = pr ? prevLimit * pr + pp : pp;
        const after = rate ? (prevLimit + 1) * rate + plus : plus;
        expect(Math.abs(after - before)).toBeLessThan(1);
      }
    }
  });
});
