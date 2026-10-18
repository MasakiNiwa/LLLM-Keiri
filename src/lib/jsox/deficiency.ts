/**
 * 内部統制の不備の評価（学習用の目安の計算。最終的な判断は総合的に行う）。
 * 実施基準では、金額的な重要性は、例えば連結税引前利益の概ね 5% 程度とすることが考えられる、とされている。
 */

/** 金額的重要性の目安（連結税引前利益に対する割合 %） */
export const MATERIALITY_RATE = 5;

export interface DeficiencyInput {
  /** 連結税引前利益 */
  pretaxIncome: number;
  /** 不備から生じうる虚偽記載の金額（潜在的な影響額） */
  potentialMisstatement: number;
  /** 質的に重要な事情（不正・経営者の関与・上場廃止基準や財務制限条項に関わるなど）があるか */
  qualitative: boolean;
}

export interface DeficiencyResult {
  threshold: number;
  /** 影響額 ÷ 目安（%） */
  ratio: number;
  /** 開示すべき重要な不備にあたる可能性が高いか */
  likelyMaterial: boolean;
  steps: string[];
  error?: string;
}

const yen = (n: number) => n.toLocaleString('ja-JP');

export function evaluateDeficiency(i: DeficiencyInput): DeficiencyResult {
  if (!(i.pretaxIncome > 0) || !(i.potentialMisstatement >= 0))
    return {
      threshold: 0,
      ratio: 0,
      likelyMaterial: false,
      steps: [],
      error: '連結税引前利益は 1 以上、影響額は 0 以上にしてください',
    };
  const threshold = Math.round((i.pretaxIncome * MATERIALITY_RATE) / 100);
  const ratio = Math.round((i.potentialMisstatement / threshold) * 1000) / 10;
  const byAmount = i.potentialMisstatement >= threshold;
  const steps = [
    `金額的重要性の目安 ＝ 連結税引前利益 ${yen(i.pretaxIncome)} × ${MATERIALITY_RATE}% ＝ ${yen(threshold)}`,
    `潜在的な影響額 ${yen(i.potentialMisstatement)} は目安の ${ratio}% → ${byAmount ? '金額的に重要' : '金額的には目安を下回る'}`,
    i.qualitative
      ? '質的に重要な事情がある → 金額が小さくても重要と判断されることがある'
      : '質的に重要な事情はない',
  ];
  return { threshold, ratio, likelyMaterial: byAmount || i.qualitative, steps };
}
