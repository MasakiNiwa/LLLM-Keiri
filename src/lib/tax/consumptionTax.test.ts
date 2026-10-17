import { describe, expect, it } from 'vitest';
import { calcConsumptionTax } from './consumptionTax';

describe('calcConsumptionTax', () => {
  it('税抜から', () => {
    expect(calcConsumptionTax(100000, 10, 'excluded')).toEqual({
      net: 100000,
      tax: 10000,
      gross: 110000,
      rate: 10,
    });
    expect(calcConsumptionTax(1234, 8, 'excluded').tax).toBe(98);
    expect(calcConsumptionTax(1234, 8, 'excluded', 'ceil').tax).toBe(99);
  });
  it('税込から', () => {
    expect(calcConsumptionTax(33000, 10, 'included')).toMatchObject({ net: 30000, tax: 3000 });
    expect(calcConsumptionTax(1080, 8, 'included')).toMatchObject({ net: 1000, tax: 80 });
    expect(calcConsumptionTax(999, 10, 'included').tax).toBe(90);
  });
});
