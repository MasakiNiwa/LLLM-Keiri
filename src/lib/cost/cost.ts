/**
 * 工業簿記・原価計算（プログラムが計算する。日商簿記 2 級の範囲の基本的な方法）。
 * - 総合原価計算（材料は工程の始点で投入、平均法・先入先出法）
 * - 製造間接費の予定配賦と差異分析（公式法変動予算）
 * - 標準原価計算の直接材料費差異（価格差異・数量差異）
 * - CVP 分析（損益分岐点）
 * 差異は「標準・予定 − 実際」で、プラスが有利差異（貸方差異）、マイナスが不利差異（借方差異）。
 */

const r0 = (n: number) => Math.round(n);

// ---------------- 総合原価計算 ----------------

export interface ProcessInput {
  /** 月初仕掛品の数量・直接材料費・加工費 */
  beginQty: number;
  beginProgress: number;
  beginMaterial: number;
  beginConversion: number;
  /** 当月投入の直接材料費・加工費 */
  material: number;
  conversion: number;
  /** 完成品の数量 */
  completedQty: number;
  /** 月末仕掛品の数量と加工進捗度（%） */
  endQty: number;
  endProgress: number;
  method: 'average' | 'fifo';
}

export interface ProcessResult {
  /** 当月に投入した数量（材料） */
  inputQty: number;
  end: { material: number; conversion: number; total: number };
  completed: { material: number; conversion: number; total: number; unit: number };
  /** 計算の説明 */
  steps: string[];
  error?: string;
}

export function processCosting(i: ProcessInput): ProcessResult {
  const empty = {
    inputQty: 0,
    end: { material: 0, conversion: 0, total: 0 },
    completed: { material: 0, conversion: 0, total: 0, unit: 0 },
    steps: [],
  };
  const nums = [
    i.beginQty,
    i.beginMaterial,
    i.beginConversion,
    i.material,
    i.conversion,
    i.completedQty,
    i.endQty,
  ];
  if (
    nums.some((n) => !Number.isFinite(n) || n < 0) ||
    [i.beginProgress, i.endProgress].some((p) => !(p >= 0 && p <= 100))
  )
    return { ...empty, error: '数量・金額は 0 以上、進捗度は 0〜100% にしてください' };
  const inputQty = i.completedQty + i.endQty - i.beginQty;
  if (inputQty < 0)
    return { ...empty, error: '完成品と月末仕掛品の数量が、月初仕掛品より少なくなっています' };
  if (i.completedQty + i.endQty === 0)
    return { ...empty, error: '完成品か月末仕掛品の数量を入れてください' };
  const endEq = (i.endQty * i.endProgress) / 100;
  const beginEq = (i.beginQty * i.beginProgress) / 100;
  const steps: string[] = [];
  let endMat: number;
  let endConv: number;
  if (i.method === 'average') {
    endMat = r0(((i.beginMaterial + i.material) * i.endQty) / (i.completedQty + i.endQty));
    endConv = endEq
      ? r0(((i.beginConversion + i.conversion) * endEq) / (i.completedQty + endEq))
      : 0;
    steps.push(
      `平均法: 月末仕掛品の材料費 ＝（月初 ${i.beginMaterial.toLocaleString()} ＋ 当月 ${i.material.toLocaleString()}）÷（完成 ${i.completedQty} ＋ 月末 ${i.endQty}）× 月末 ${i.endQty} ＝ ${endMat.toLocaleString()}`,
      `月末仕掛品の加工費 ＝（月初 ${i.beginConversion.toLocaleString()} ＋ 当月 ${i.conversion.toLocaleString()}）÷（完成 ${i.completedQty} ＋ 月末換算 ${endEq}）× 月末換算 ${endEq} ＝ ${endConv.toLocaleString()}`,
    );
  } else {
    const convInput = i.completedQty - beginEq + endEq;
    if (convInput <= 0 && i.conversion > 0)
      return {
        ...empty,
        error: '当月の加工の量（換算量）が 0 以下になります。数量と進捗度を確かめてください',
      };
    endMat = inputQty ? r0((i.material * i.endQty) / inputQty) : 0;
    endConv = convInput > 0 ? r0((i.conversion * endEq) / convInput) : 0;
    steps.push(
      `先入先出法: 当月投入量（材料）＝ 完成 ${i.completedQty} − 月初 ${i.beginQty} ＋ 月末 ${i.endQty} ＝ ${inputQty}`,
      `月末仕掛品の材料費 ＝ 当月 ${i.material.toLocaleString()} ÷ ${inputQty} × 月末 ${i.endQty} ＝ ${endMat.toLocaleString()}`,
      `当月の加工量（換算）＝ 完成 ${i.completedQty} − 月初換算 ${beginEq} ＋ 月末換算 ${endEq} ＝ ${convInput}`,
      `月末仕掛品の加工費 ＝ 当月 ${i.conversion.toLocaleString()} ÷ ${convInput} × 月末換算 ${endEq} ＝ ${endConv.toLocaleString()}`,
    );
  }
  const compMat = i.beginMaterial + i.material - endMat;
  const compConv = i.beginConversion + i.conversion - endConv;
  const total = compMat + compConv;
  steps.push(`完成品原価 ＝ 月初 ＋ 当月 − 月末仕掛品 ＝ ${total.toLocaleString()}`);
  return {
    inputQty,
    end: { material: endMat, conversion: endConv, total: endMat + endConv },
    completed: {
      material: compMat,
      conversion: compConv,
      total,
      unit: i.completedQty ? Math.round((total / i.completedQty) * 100) / 100 : 0,
    },
    steps,
  };
}

// ---------------- 製造間接費の差異分析 ----------------

export interface OverheadInput {
  /** 月間の変動費の予算（基準操業度での額）と固定費の予算 */
  variableBudget: number;
  fixedBudget: number;
  /** 基準操業度（直接作業時間など） */
  normalHours: number;
  /** 実際操業度 */
  actualHours: number;
  /** 実際発生額 */
  actualCost: number;
}

export interface OverheadResult {
  rate: number;
  variableRate: number;
  fixedRate: number;
  applied: number;
  /** 配賦差異 ＝ 予定配賦額 − 実際発生額 */
  total: number;
  /** 予算許容額 ＝ 変動費率 × 実際操業度 ＋ 固定費予算 */
  allowed: number;
  budget: number;
  volume: number;
  error?: string;
}

export function overheadVariance(i: OverheadInput): OverheadResult {
  const zero = {
    rate: 0,
    variableRate: 0,
    fixedRate: 0,
    applied: 0,
    total: 0,
    allowed: 0,
    budget: 0,
    volume: 0,
  };
  if (
    [i.variableBudget, i.fixedBudget, i.actualHours, i.actualCost].some((n) => !(n >= 0)) ||
    !(i.normalHours > 0)
  )
    return { ...zero, error: '金額・時間は 0 以上、基準操業度は 1 以上にしてください' };
  const variableRate = i.variableBudget / i.normalHours;
  const fixedRate = i.fixedBudget / i.normalHours;
  const rate = variableRate + fixedRate;
  const applied = r0(rate * i.actualHours);
  const allowed = r0(variableRate * i.actualHours + i.fixedBudget);
  const budget = allowed - i.actualCost;
  const volume = r0(fixedRate * (i.actualHours - i.normalHours));
  return {
    rate,
    variableRate,
    fixedRate,
    applied,
    total: applied - i.actualCost,
    allowed,
    budget,
    volume,
  };
}

// ---------------- 標準原価計算（直接材料費） ----------------

export interface StandardInput {
  standardPrice: number;
  /** 実際の生産量に対する標準消費量 */
  standardQty: number;
  actualPrice: number;
  actualQty: number;
}

export interface StandardResult {
  standardCost: number;
  actualCost: number;
  total: number;
  /** 価格差異 ＝（標準単価 − 実際単価）× 実際消費量 */
  price: number;
  /** 数量差異 ＝ 標準単価 ×（標準消費量 − 実際消費量） */
  quantity: number;
}

export function materialVariance(i: StandardInput): StandardResult {
  const standardCost = r0(i.standardPrice * i.standardQty);
  const actualCost = r0(i.actualPrice * i.actualQty);
  const price = r0((i.standardPrice - i.actualPrice) * i.actualQty);
  const quantity = r0(i.standardPrice * (i.standardQty - i.actualQty));
  return { standardCost, actualCost, total: standardCost - actualCost, price, quantity };
}

// ---------------- CVP 分析 ----------------

export interface CvpInput {
  sales: number;
  variableCosts: number;
  fixedCosts: number;
  /** 目標営業利益（任意） */
  targetProfit?: number;
}

export interface CvpResult {
  contributionMargin: number;
  /** 限界利益率（%） */
  contributionRatio: number;
  operatingIncome: number;
  /** 損益分岐点の売上高（限界利益率が 0 以下なら null） */
  breakEvenSales: number | null;
  /** 安全余裕率（%） */
  safetyMargin: number | null;
  targetSales: number | null;
}

export function cvp(i: CvpInput): CvpResult {
  const cm = i.sales - i.variableCosts;
  const ratio = i.sales > 0 ? cm / i.sales : 0;
  // 割り算の誤差で 1 円ずれないよう、売上高 × 固定費 ÷ 限界利益 で計算する
  const bep = cm > 0 && i.sales > 0 ? Math.ceil((i.fixedCosts * i.sales) / cm - 1e-9) : null;
  return {
    contributionMargin: cm,
    contributionRatio: Math.round(ratio * 1000) / 10,
    operatingIncome: cm - i.fixedCosts,
    breakEvenSales: bep,
    safetyMargin:
      bep !== null && i.sales > 0 ? Math.round(((i.sales - bep) / i.sales) * 1000) / 10 : null,
    targetSales:
      cm > 0 && i.sales > 0 && i.targetProfit !== undefined
        ? Math.ceil(((i.fixedCosts + i.targetProfit) * i.sales) / cm - 1e-9)
        : null,
  };
}
