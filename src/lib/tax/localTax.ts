/**
 * 法人の地方税など（学習用。プログラムが計算する）。標準税率で計算する。
 *
 * - 地方法人税（国税）＝ 課税標準法人税額（1,000 円未満切り捨て）× 10.3%（100 円未満切り捨て）
 * - 法人住民税の法人税割 ＝ 法人税額（1,000 円未満切り捨て）× 道府県民税 1.0% ／ 市町村民税 6.0%
 * - 法人住民税の均等割 ＝ 資本金等の額・従業者数の区分の年額 × 月数 ÷ 12（100 円未満切り捨て）
 * - 法人事業税の所得割（外形標準課税の対象でない普通法人。軽減税率あり）
 *   年 400 万円以下 3.5%、400 万円超 800 万円以下 5.3%、800 万円超 7.0%
 * - 特別法人事業税 ＝ 基準法人所得割額（標準税率の所得割）× 37%
 *
 * 実際の税率は都道府県・市町村の条例で標準税率より高い（超過課税）ことがある。
 * 2019 年 10 月 1 日以後に開始する事業年度の税率。
 */

export interface LocalTaxInput {
  /** 法人税額（別表一。税額控除などの前） */
  corporateTax: number;
  /** 所得金額（別表四） */
  income: number;
  /** 資本金等の額 */
  capital: number;
  /** 市町村内の従業者数 */
  employees: number;
  /** 事業年度の月数 */
  months: number;
  /** 事業税の軽減税率を使えない法人（3 以上の都道府県に事務所があり、資本金 1,000 万円以上） */
  noReducedRate?: boolean;
}

export interface LocalTaxLine {
  label: string;
  /** 計算式の説明 */
  formula: string;
  amount: number;
  /** 法人税の計算で損金になるか（事業税は払った期の損金） */
  deductible: boolean;
}

export interface LocalTaxResult {
  lines: LocalTaxLine[];
  total: number;
  error?: string;
}

const floor = (n: number, unit: number) => Math.floor(n / unit) * unit;
const fmt = (n: number) => n.toLocaleString('ja-JP');

/** 道府県民税の均等割（標準税率の年額） */
export function prefecturalPerCapita(capital: number): number {
  if (capital <= 10_000_000) return 20_000;
  if (capital <= 100_000_000) return 50_000;
  if (capital <= 1_000_000_000) return 130_000;
  if (capital <= 5_000_000_000) return 540_000;
  return 800_000;
}

/** 市町村民税の均等割（標準税率の年額。従業者数 50 人超かどうかで変わる） */
export function municipalPerCapita(capital: number, employees: number): number {
  const many = employees > 50;
  if (capital <= 10_000_000) return many ? 120_000 : 50_000;
  if (capital <= 100_000_000) return many ? 150_000 : 130_000;
  if (capital <= 1_000_000_000) return many ? 400_000 : 160_000;
  if (capital <= 5_000_000_000) return many ? 1_750_000 : 410_000;
  return many ? 3_000_000 : 410_000;
}

/** 事業税の所得割（標準税率。100 円未満切り捨て） */
export function enterpriseIncomeTax(income: number, noReducedRate = false): number {
  const base = Math.max(0, floor(income, 1000));
  if (noReducedRate) return floor(base * 0.07, 100);
  const a = Math.min(base, 4_000_000);
  const b = Math.min(Math.max(base - 4_000_000, 0), 4_000_000);
  const c = Math.max(base - 8_000_000, 0);
  return floor(a * 0.035 + b * 0.053 + c * 0.07, 100);
}

export function localTax(i: LocalTaxInput): LocalTaxResult {
  if (
    [i.corporateTax, i.income, i.capital, i.employees].some((n) => !Number.isFinite(n) || n < 0) ||
    !(i.months >= 1 && i.months <= 12)
  )
    return { lines: [], total: 0, error: '金額・人数は 0 以上、月数は 1〜12 にしてください' };
  const taxBase = floor(i.corporateTax, 1000);
  const months = Math.floor(i.months);
  const byMonths = (annual: number) => floor((annual * months) / 12, 100);
  const pref = prefecturalPerCapita(i.capital);
  const muni = municipalPerCapita(i.capital, i.employees);
  const enterprise = enterpriseIncomeTax(i.income, i.noReducedRate);
  const lines: LocalTaxLine[] = [
    {
      label: '地方法人税（国税）',
      formula: `${fmt(taxBase)} × 10.3%`,
      amount: floor(taxBase * 0.103, 100),
      deductible: false,
    },
    {
      label: '道府県民税 法人税割',
      formula: `${fmt(taxBase)} × 1.0%`,
      amount: floor(taxBase * 0.01, 100),
      deductible: false,
    },
    {
      label: '市町村民税 法人税割',
      formula: `${fmt(taxBase)} × 6.0%`,
      amount: floor(taxBase * 0.06, 100),
      deductible: false,
    },
    {
      label: '道府県民税 均等割',
      formula: `年 ${fmt(pref)} × ${months}/12`,
      amount: byMonths(pref),
      deductible: false,
    },
    {
      label: '市町村民税 均等割',
      formula: `年 ${fmt(muni)} × ${months}/12`,
      amount: byMonths(muni),
      deductible: false,
    },
    {
      label: '事業税 所得割',
      formula: i.noReducedRate
        ? `${fmt(floor(i.income, 1000))} × 7.0%`
        : '400 万円以下 3.5%・800 万円以下 5.3%・超える部分 7.0%',
      amount: enterprise,
      deductible: true,
    },
    {
      label: '特別法人事業税',
      formula: `${fmt(enterprise)} × 37%`,
      amount: floor(enterprise * 0.37, 100),
      deductible: true,
    },
  ];
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}
