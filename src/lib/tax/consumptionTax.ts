/** 1 円未満の端数の処理（消費税の端数処理は事業者が選べる） */
export type Rounding = 'floor' | 'round' | 'ceil';

export const ROUNDING_LABELS: Record<Rounding, string> = {
  floor: '切り捨て',
  round: '四捨五入',
  ceil: '切り上げ',
};

export interface TaxResult {
  /** 税抜の金額 */
  net: number;
  /** 消費税の額 */
  tax: number;
  /** 税込の金額 */
  gross: number;
  /** 税率（%） */
  rate: number;
}

function roundBy(value: number, r: Rounding): number {
  // 割り算の誤差で 1 円ずれないよう、ごく小さな値を足し引きしてから丸める
  if (r === 'floor') return Math.floor(value + 1e-9);
  if (r === 'ceil') return Math.ceil(value - 1e-9);
  return Math.round(value);
}

/**
 * 消費税を計算する（1 つの金額について）。
 * - excluded: amount は税抜。税額 ＝ 税抜 × 税率
 * - included: amount は税込。税額 ＝ 税込 × 税率 ÷ (100 ＋ 税率)
 */
export function calcConsumptionTax(
  amount: number,
  rate: number,
  mode: 'excluded' | 'included',
  rounding: Rounding = 'floor',
): TaxResult {
  if (mode === 'excluded') {
    const tax = roundBy((amount * rate) / 100, rounding);
    return { net: amount, tax, gross: amount + tax, rate };
  }
  const tax = roundBy((amount * rate) / (100 + rate), rounding);
  return { net: amount - tax, tax, gross: amount, rate };
}
