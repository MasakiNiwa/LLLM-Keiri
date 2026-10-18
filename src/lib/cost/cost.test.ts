import { describe, expect, it } from 'vitest';
import { cvp, materialVariance, overheadVariance, processCosting } from './cost';

const base = {
  beginQty: 200,
  beginProgress: 50,
  beginMaterial: 40000,
  beginConversion: 18000,
  material: 200000,
  conversion: 279000,
  completedQty: 1000,
  endQty: 200,
  endProgress: 50,
};

describe('総合原価計算', () => {
  it('平均法', () => {
    const r = processCosting({ ...base, method: 'average' });
    // 材料 (40,000 + 200,000) ÷ 1,200 × 200 ＝ 40,000、加工 (18,000 + 279,000) ÷ 1,100 × 100 ＝ 27,000
    expect(r.end).toEqual({ material: 40000, conversion: 27000, total: 67000 });
    expect(r.completed.total).toBe(40000 + 18000 + 200000 + 279000 - 67000);
  });
  it('先入先出法', () => {
    const r = processCosting({ ...base, method: 'fifo' });
    // 投入 1,000。材料 200,000 ÷ 1,000 × 200 ＝ 40,000。加工量 1,000 − 100 ＋ 100 ＝ 1,000、279,000 ÷ 1,000 × 100 ＝ 27,900
    expect(r.inputQty).toBe(1000);
    expect(r.end).toEqual({ material: 40000, conversion: 27900, total: 67900 });
    expect(r.completed.total).toBe(469100);
    expect(r.completed.unit).toBe(469.1);
  });
  it('数量の矛盾はエラー', () => {
    expect(
      processCosting({ ...base, completedQty: 0, endQty: 100, method: 'fifo' }).error,
    ).toBeTruthy();
  });
});

describe('製造間接費の差異（公式法変動予算）', () => {
  it('予算差異と操業度差異', () => {
    // 変動費率 200、固定費率 300（予算 変動 200,000・固定 300,000・基準 1,000 時間）
    const r = overheadVariance({
      variableBudget: 200000,
      fixedBudget: 300000,
      normalHours: 1000,
      actualHours: 950,
      actualCost: 492000,
    });
    expect(r.applied).toBe(475000);
    expect(r.total).toBe(-17000);
    expect(r.allowed).toBe(490000);
    expect(r.budget).toBe(-2000);
    expect(r.volume).toBe(-15000);
    expect(r.budget + r.volume).toBe(r.total);
  });
});

describe('標準原価計算（直接材料費）', () => {
  it('価格差異と数量差異', () => {
    const r = materialVariance({
      standardPrice: 100,
      standardQty: 1000,
      actualPrice: 105,
      actualQty: 980,
    });
    expect(r.price).toBe(-4900);
    expect(r.quantity).toBe(2000);
    expect(r.price + r.quantity).toBe(r.total);
  });
});

describe('CVP 分析', () => {
  it('損益分岐点と安全余裕率', () => {
    const r = cvp({
      sales: 1000000,
      variableCosts: 600000,
      fixedCosts: 300000,
      targetProfit: 200000,
    });
    expect(r.contributionRatio).toBe(40);
    expect(r.breakEvenSales).toBe(750000);
    expect(r.safetyMargin).toBe(25);
    expect(r.targetSales).toBe(1250000);
  });
});
