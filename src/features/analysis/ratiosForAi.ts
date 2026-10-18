import { ratioText, type Ratio } from '@/lib/analysis/ratios';

/** AI に渡す比率（名前 → 「値（式: 分子 ÷ 分母）」） */
export function ratiosForAi(ratios: Ratio[]): Record<string, string> {
  return Object.fromEntries(
    ratios.map((r) => [
      r.label,
      `${ratioText(r)}（${r.numerator.label} ${r.numerator.value} ÷ ${r.denominator.label} ${r.denominator.value}）`,
    ]),
  );
}
