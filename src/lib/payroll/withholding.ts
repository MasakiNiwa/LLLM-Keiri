/**
 * 毎月の源泉所得税（月額表の甲欄）を、電算機計算の特例の方法で計算する（学習用）。
 *
 * 1. A ＝ その月の社会保険料等控除後の給与等の金額
 * 2. 課税給与所得金額 B ＝ A − 給与所得控除（1 円未満切り上げ）− 配偶者・扶養控除 − 基礎控除
 * 3. 税額 ＝ B × 税率 − 控除額（復興特別所得税を含む。10 円未満四捨五入）
 *
 * 税額表（月額表）を引いた額と、数円〜数十円違うことがある。どちらを使うかは会社で決めて続ける。
 */
import { MONTHLY_RATES, rulesFor } from './taxYears.ts';

export interface MonthlyWithholding {
  employmentDeduction: number;
  basicDeduction: number;
  dependentDeduction: number;
  taxable: number;
  tax: number;
  year: number;
}

export function monthlyWithholding(
  a: number,
  dependents: number,
  year: number,
): MonthlyWithholding {
  const rules = rulesFor(year);
  const m = rules.monthly;
  const base = Math.max(0, Math.floor(a));
  const [, rate, plus] = m.employment.find(([limit]) => base <= limit)!;
  const employmentDeduction = Math.ceil(rate ? base * rate + plus : plus);
  const basicDeduction = m.basic.find(([limit]) => base <= limit)?.[1] ?? 0;
  const dependentDeduction = Math.max(0, Math.floor(dependents)) * m.dependent;
  const taxable = Math.max(0, base - employmentDeduction - basicDeduction - dependentDeduction);
  const [, r, minus] = MONTHLY_RATES.find(([limit]) => taxable <= limit)!;
  const tax = Math.max(0, Math.round((taxable * r - minus) / 10) * 10);
  return {
    employmentDeduction,
    basicDeduction,
    dependentDeduction,
    taxable,
    tax,
    year: rules.year,
  };
}
