import { describe, expect, it } from 'vitest';
import {
  enterpriseIncomeTax,
  localTax,
  municipalPerCapita,
  prefecturalPerCapita,
} from './localTax';

describe('法人の地方税など（標準税率）', () => {
  it('A 社（法人税額 1,466,800・所得 9,150,000・資本金 1,000 万円・30 人）', () => {
    const r = localTax({
      corporateTax: 1_466_800,
      income: 9_150_000,
      capital: 10_000_000,
      employees: 30,
      months: 12,
    });
    expect(r.lines.map((l) => l.amount)).toEqual([
      150_900, 14_600, 87_900, 20_000, 50_000, 432_500, 160_000,
    ]);
    expect(r.total).toBe(915_900);
  });
  it('均等割の区分', () => {
    expect(prefecturalPerCapita(10_000_000)).toBe(20_000);
    expect(prefecturalPerCapita(10_000_001)).toBe(50_000);
    expect(municipalPerCapita(10_000_000, 51)).toBe(120_000);
    expect(municipalPerCapita(300_000_000, 10)).toBe(160_000);
  });
  it('事業税の軽減税率と、使えない法人', () => {
    expect(enterpriseIncomeTax(4_000_000)).toBe(140_000);
    expect(enterpriseIncomeTax(9_150_000, true)).toBe(640_500);
  });
  it('月数で均等割を按分', () => {
    const r = localTax({
      corporateTax: 0,
      income: 0,
      capital: 10_000_000,
      employees: 1,
      months: 6,
    });
    expect(r.lines[3].amount).toBe(10_000);
    expect(r.lines[4].amount).toBe(25_000);
  });
});
