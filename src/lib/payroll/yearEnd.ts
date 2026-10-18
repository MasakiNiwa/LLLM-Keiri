/**
 * 年末調整の年税額の計算（学習用）。年分で変わる金額は taxYears.ts の年分ごとのデータを使う。
 *
 * 1. 給与所得 ＝ 給与の収入金額 − 給与所得控除（660 万円未満は 4,000 円単位に切り下げた額で計算する所得税法別表第五の方式）
 * 2. 課税給与所得金額 ＝ 給与所得 − 所得控除（1,000 円未満切り捨て）
 * 3. 算出所得税額（速算表）− 住宅借入金等特別控除 ＝ 年調所得税額
 * 4. 年調年税額 ＝ 年調所得税額 × 102.1%（復興特別所得税を含む。100 円未満切り捨て）
 * 5. 過不足額 ＝ 源泉徴収した税額 − 年調年税額（プラスなら還付、マイナスなら追加で徴収）
 *
 * 新しい年分は、税制改正の内容を確かめて taxYears.ts に追加する。
 */
import { rulesFor, type YearEndRules } from './taxYears.ts';

/** 既定の年分（年末調整のレッスンの例はこの年分で説明している） */
export const RULE_YEAR = 2025;

/** 給与所得控除後の給与等の金額 */
export function employmentIncome(
  salary: number,
  rules: YearEndRules = rulesFor(RULE_YEAR),
): number {
  if (salary < 0) return 0;
  const { flatUntil, minimum } = rules.employment;
  if (salary < flatUntil) return Math.max(0, salary - minimum);
  if (salary < 6_600_000) {
    // 4,000 円未満を切り捨てた額で計算する（所得税法別表第五）
    const a = Math.floor(salary / 4000) * 4000;
    if (a < 3_600_000) return Math.floor(a - (a * 0.3 + 80_000));
    return Math.floor(a - (a * 0.2 + 440_000));
  }
  if (salary <= 8_500_000) return Math.floor(salary - (salary * 0.1 + 1_100_000));
  return salary - 1_950_000;
}

/** 基礎控除（合計所得金額に応じて） */
export function basicDeduction(
  totalIncome: number,
  rules: YearEndRules = rulesFor(RULE_YEAR),
): number {
  return rules.basic.find(([limit]) => totalIncome <= limit)?.[1] ?? 0;
}

/** 所得税の速算表（課税所得金額 → 税額） */
export function incomeTaxByTable(taxable: number): number {
  const brackets: [number, number, number][] = [
    [1_950_000, 0.05, 0],
    [3_300_000, 0.1, 97_500],
    [6_950_000, 0.2, 427_500],
    [9_000_000, 0.23, 636_000],
    [18_000_000, 0.33, 1_536_000],
    [40_000_000, 0.4, 2_796_000],
    [Infinity, 0.45, 4_796_000],
  ];
  const [, rate, minus] = brackets.find(([limit]) => taxable <= limit)!;
  return Math.max(0, Math.floor(taxable * rate - minus));
}

export interface YearEndInput {
  /** 1 年間の給与・賞与の総額（課税分） */
  salary: number;
  /** 1 年間に源泉徴収した税額 */
  withheld: number;
  /** 社会保険料控除（給与から差し引いた分など） */
  socialInsurance: number;
  /** 生命保険料控除・地震保険料控除の額（保険料控除申告書で計算した額） */
  insurance: number;
  /** 配偶者控除・配偶者特別控除の額 */
  spouse: number;
  /** 一般の扶養親族（16 歳以上 19 歳未満・23 歳以上 70 歳未満）の人数（1 人 38 万円） */
  dependents: number;
  /** 特定扶養親族（19 歳以上 23 歳未満）の人数（1 人 63 万円） */
  specificDependents: number;
  /** 老人扶養親族（70 歳以上。同居老親等以外）の人数（1 人 48 万円） */
  elderlyDependents: number;
  /** 住宅借入金等特別控除の額 */
  housingLoan: number;
  /** 年分（省略すると RULE_YEAR） */
  year?: number;
}

export interface YearEndResult {
  rules: YearEndRules;
  employmentIncome: number;
  deductions: { label: string; amount: number }[];
  deductionTotal: number;
  taxable: number;
  computedTax: number;
  annualTax: number;
  /** 源泉徴収した税額 − 年税額（プラスは還付、マイナスは不足） */
  difference: number;
}

export function yearEndAdjustment(i: YearEndInput): YearEndResult {
  const rules = rulesFor(i.year ?? RULE_YEAR);
  const inc = employmentIncome(i.salary, rules);
  const d = rules.dependents;
  const deductions = [
    { label: '社会保険料控除', amount: i.socialInsurance },
    { label: '生命保険料控除・地震保険料控除', amount: i.insurance },
    { label: '配偶者（特別）控除', amount: i.spouse },
    {
      label: '扶養控除',
      amount:
        i.dependents * d.general +
        i.specificDependents * d.specific +
        i.elderlyDependents * d.elderly,
    },
    // 給与所得のほかに所得がないものとして、給与所得を合計所得金額とみなす
    { label: '基礎控除', amount: basicDeduction(inc, rules) },
  ];
  const deductionTotal = deductions.reduce((s, d) => s + d.amount, 0);
  const taxable = Math.max(0, Math.floor((inc - deductionTotal) / 1000) * 1000);
  const computedTax = incomeTaxByTable(taxable);
  const afterCredit = Math.max(0, computedTax - i.housingLoan);
  const annualTax = Math.floor((afterCredit * 1.021) / 100) * 100;
  return {
    rules,
    employmentIncome: inc,
    deductions,
    deductionTotal,
    taxable,
    computedTax,
    annualTax,
    difference: i.withheld - annualTax,
  };
}
