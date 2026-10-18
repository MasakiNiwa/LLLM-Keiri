/**
 * 年末調整の年税額の計算（2025 年分＝令和 7 年分のルール。学習用）。
 *
 * 1. 給与所得 ＝ 給与の収入金額 − 給与所得控除（660 万円未満は 4,000 円単位に切り下げた額で計算する所得税法別表第五の方式）
 * 2. 課税給与所得金額 ＝ 給与所得 − 所得控除（1,000 円未満切り捨て）
 * 3. 算出所得税額（速算表）− 住宅借入金等特別控除 ＝ 年調所得税額
 * 4. 年調年税額 ＝ 年調所得税額 × 102.1%（復興特別所得税を含む。100 円未満切り捨て）
 * 5. 過不足額 ＝ 源泉徴収した税額 − 年調年税額（プラスなら還付、マイナスなら追加で徴収）
 *
 * 2026 年分以降は、税制改正で控除額などが変わることがあるので、その年のルールを確かめる。
 */

export const RULE_YEAR = 2025;

/** 給与所得控除後の給与等の金額（2025 年分以降の給与所得控除） */
export function employmentIncome(salary: number): number {
  if (salary < 0) return 0;
  if (salary < 1_900_000) return Math.max(0, salary - 650_000);
  if (salary < 6_600_000) {
    // 4,000 円未満を切り捨てた額で計算する（所得税法別表第五）
    const a = Math.floor(salary / 4000) * 4000;
    if (a < 3_600_000) return Math.floor(a - (a * 0.3 + 80_000));
    return Math.floor(a - (a * 0.2 + 440_000));
  }
  if (salary <= 8_500_000) return Math.floor(salary - (salary * 0.1 + 1_100_000));
  return salary - 1_950_000;
}

/** 基礎控除（2025 年分。合計所得金額に応じて） */
export function basicDeduction(totalIncome: number): number {
  if (totalIncome <= 1_320_000) return 950_000;
  if (totalIncome <= 3_360_000) return 880_000;
  if (totalIncome <= 4_890_000) return 680_000;
  if (totalIncome <= 6_550_000) return 630_000;
  if (totalIncome <= 23_500_000) return 580_000;
  if (totalIncome <= 24_000_000) return 480_000;
  if (totalIncome <= 24_500_000) return 320_000;
  if (totalIncome <= 25_000_000) return 160_000;
  return 0;
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
}

export interface YearEndResult {
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
  const inc = employmentIncome(i.salary);
  const deductions = [
    { label: '社会保険料控除', amount: i.socialInsurance },
    { label: '生命保険料控除・地震保険料控除', amount: i.insurance },
    { label: '配偶者（特別）控除', amount: i.spouse },
    {
      label: '扶養控除',
      amount:
        i.dependents * 380_000 + i.specificDependents * 630_000 + i.elderlyDependents * 480_000,
    },
    // 給与所得のほかに所得がないものとして、給与所得を合計所得金額とみなす
    { label: '基礎控除', amount: basicDeduction(inc) },
  ];
  const deductionTotal = deductions.reduce((s, d) => s + d.amount, 0);
  const taxable = Math.max(0, Math.floor((inc - deductionTotal) / 1000) * 1000);
  const computedTax = incomeTaxByTable(taxable);
  const afterCredit = Math.max(0, computedTax - i.housingLoan);
  const annualTax = Math.floor((afterCredit * 1.021) / 100) * 100;
  return {
    employmentIncome: inc,
    deductions,
    deductionTotal,
    taxable,
    computedTax,
    annualTax,
    difference: i.withheld - annualTax,
  };
}
