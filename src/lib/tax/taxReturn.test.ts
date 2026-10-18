import { describe, expect, it } from 'vitest';
import { taxReturn, type TaxReturnInput } from './taxReturn';

/** 通しの演習の会社（content/lessons/tax/05d-return-walkthrough.md と同じ数字） */
const CASE: TaxReturnInput = {
  netIncome: 6_000_000,
  dividends: 1_000_000,
  interimCorporateTax: 400_000,
  interimResidentTax: 50_000,
  provision: 1_750_000,
  provisionOpening: 1_200_000,
  provisionUsed: 1_200_000,
  provisionUsedEnterpriseTax: 250_000,
  entertainment: 9_000_000,
  entertainmentMeals: 4_000_000,
  smallCompany: true,
  depreciationExcess: 300_000,
  dividendExclusion: 100_000,
};

describe('法人税申告書の通しの計算', () => {
  const r = taxReturn(CASE);
  it('別表十五: 中小法人は定額控除が有利', () => {
    expect(r.entertainment.limit).toBe(8_000_000);
    expect(r.entertainment.nondeductible).toBe(1_000_000);
  });
  it('別表四: 加算・減算・所得と留保', () => {
    expect(r.beppyo4.addTotal.total).toBe(3_500_000);
    expect(r.beppyo4.deductTotal.total).toBe(350_000);
    expect(r.beppyo4.income.total).toBe(9_150_000);
    expect(r.beppyo4.income.retained).toBe(7_250_000);
    expect(r.beppyo4.income.outflow).toBe(1_900_000);
  });
  it('別表一: 軽減税率と差引の納付額', () => {
    expect(r.beppyo1.brackets.map((b) => b.tax)).toEqual([1_200_000, 266_800]);
    expect(r.beppyo1.corporateTax).toBe(1_466_800);
    expect(r.beppyo1.payable).toBe(1_066_800);
  });
  it('別表五(一): 期末 ＝ 期首 − 減 ＋ 増', () => {
    expect(r.beppyo5[0].closing).toBe(300_000);
    expect(r.beppyo5[1].closing).toBe(1_750_000);
  });
  it('大きな法人は接待飲食費の 50% だけ、税率は 23.2%', () => {
    const big = taxReturn({ ...CASE, smallCompany: false });
    expect(big.entertainment.nondeductible).toBe(7_000_000);
    expect(big.beppyo1.brackets).toHaveLength(1);
    expect(big.beppyo1.corporateTax).toBe(Math.floor((15_150_000 * 23.2) / 100));
  });
});
