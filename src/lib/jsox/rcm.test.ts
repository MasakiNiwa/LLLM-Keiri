import { describe, expect, it } from 'vitest';
import { gradeRisk } from './rcm';

const risk = {
  id: 'r1',
  risk: '承認されていない発注',
  control: 's1',
  assertion: '実在性' as const,
  type: '予防' as const,
  method: '手作業' as const,
  explanation: '',
};

describe('RCM の採点', () => {
  it('4 つがすべて合えば正解', () => {
    const g = gradeRisk(risk, {
      control: 's1',
      assertion: '実在性',
      type: '予防',
      method: '手作業',
    });
    expect(g.correct).toBe(true);
    expect(g.incomplete).toBe(false);
  });
  it('違う項目だけ × にする', () => {
    const g = gradeRisk(risk, {
      control: 's2',
      assertion: '実在性',
      type: '発見',
      method: '手作業',
    });
    expect(g.correct).toBe(false);
    expect(g.fields).toEqual({ control: false, assertion: true, type: false, method: true });
  });
  it('未選択があれば incomplete', () => {
    expect(gradeRisk(risk, { control: 's1' }).incomplete).toBe(true);
  });
});
