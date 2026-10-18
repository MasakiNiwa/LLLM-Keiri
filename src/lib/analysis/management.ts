/**
 * 経営への報告のための分析（プログラムが計算する）。
 * - 売上高の予実差異を、価格差異と数量差異に分ける
 * - ROE をデュポン分解（売上高純利益率 × 総資産回転率 × 財務レバレッジ）する
 */

// ---------------- 売上高の予実差異 ----------------

export interface SalesVarianceInput {
  /** 予算の販売単価 */
  budgetPrice: number;
  /** 予算の販売数量 */
  budgetQuantity: number;
  /** 実績の販売単価 */
  actualPrice: number;
  /** 実績の販売数量 */
  actualQuantity: number;
}

export interface SalesVarianceResult {
  budgetSales: number;
  actualSales: number;
  /** 総差異 ＝ 実績 − 予算（正は有利差異） */
  total: number;
  /** 価格差異 ＝（実績単価 − 予算単価）× 実績数量 */
  price: number;
  /** 数量差異 ＝（実績数量 − 予算数量）× 予算単価 */
  quantity: number;
  error?: string;
}

export function salesVariance(i: SalesVarianceInput): SalesVarianceResult {
  const values = [i.budgetPrice, i.budgetQuantity, i.actualPrice, i.actualQuantity];
  if (values.some((n) => !(n >= 0)))
    return {
      budgetSales: 0,
      actualSales: 0,
      total: 0,
      price: 0,
      quantity: 0,
      error: '単価と数量は 0 以上にしてください',
    };
  const budgetSales = Math.round(i.budgetPrice * i.budgetQuantity);
  const actualSales = Math.round(i.actualPrice * i.actualQuantity);
  const price = Math.round((i.actualPrice - i.budgetPrice) * i.actualQuantity);
  return {
    budgetSales,
    actualSales,
    total: actualSales - budgetSales,
    price,
    // 端数のずれは数量差異で吸収し、価格差異 ＋ 数量差異 ＝ 総差異 を保つ
    quantity: actualSales - budgetSales - price,
  };
}

// ---------------- ROE のデュポン分解 ----------------

export interface DupontInput {
  /** 当期純利益 */
  netIncome: number;
  /** 売上高 */
  sales: number;
  /** 総資産 */
  totalAssets: number;
  /** 自己資本（純資産） */
  equity: number;
}

export interface DupontResult {
  /** 売上高純利益率（%） */
  margin: number;
  /** 総資産回転率（回） */
  turnover: number;
  /** 財務レバレッジ（倍）＝ 総資産 ÷ 自己資本 */
  leverage: number;
  /** ROE（%）＝ 当期純利益 ÷ 自己資本 */
  roe: number;
  /** ROA（%）＝ 当期純利益 ÷ 総資産 */
  roa: number;
  /** 自己資本比率（%） */
  equityRatio: number;
  error?: string;
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export function dupont(i: DupontInput): DupontResult {
  if (!(i.sales > 0) || !(i.totalAssets > 0) || !(i.equity > 0) || !Number.isFinite(i.netIncome))
    return {
      margin: 0,
      turnover: 0,
      leverage: 0,
      roe: 0,
      roa: 0,
      equityRatio: 0,
      error: '売上高・総資産・自己資本は 1 以上にしてください',
    };
  return {
    margin: round((i.netIncome / i.sales) * 100, 2),
    turnover: round(i.sales / i.totalAssets, 2),
    leverage: round(i.totalAssets / i.equity, 2),
    roe: round((i.netIncome / i.equity) * 100, 2),
    roa: round((i.netIncome / i.totalAssets) * 100, 2),
    equityRatio: round((i.equity / i.totalAssets) * 100, 1),
  };
}
