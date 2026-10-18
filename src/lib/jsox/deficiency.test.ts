import { describe, expect, it } from 'vitest';
import { evaluateDeficiency } from './deficiency';

describe('不備の評価（目安）', () => {
  it('連結税引前利益の 5% と比べる', () => {
    const r = evaluateDeficiency({
      pretaxIncome: 2_000_000_000,
      potentialMisstatement: 120_000_000,
      qualitative: false,
    });
    expect(r.threshold).toBe(100_000_000);
    expect(r.ratio).toBe(120);
    expect(r.likelyMaterial).toBe(true);
  });
  it('金額が小さくても、質的に重要なら重要と判断されうる', () => {
    const r = evaluateDeficiency({
      pretaxIncome: 2_000_000_000,
      potentialMisstatement: 10_000_000,
      qualitative: true,
    });
    expect(r.likelyMaterial).toBe(true);
    expect(
      evaluateDeficiency({
        pretaxIncome: 2_000_000_000,
        potentialMisstatement: 10_000_000,
        qualitative: false,
      }).likelyMaterial,
    ).toBe(false);
  });
});
