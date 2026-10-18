import { describe, expect, it } from 'vitest';
import { consumptionTaxSettlement } from './settlement';
import { rewardEntries, withholdingTax } from './withholding';

const balanced = (lines: { side: string; amount: number }[]) =>
  lines.filter((l) => l.side === 'dr').reduce((s, l) => s + l.amount, 0) ===
  lines.filter((l) => l.side === 'cr').reduce((s, l) => s + l.amount, 0);

describe('報酬の源泉徴収', () => {
  it('100 万円以下は 10.21%', () => {
    expect(withholdingTax(100000)).toBe(10210);
    expect(withholdingTax(55555)).toBe(5672); // 5,672.1655 → 切り捨て
  });
  it('100 万円を超える部分は 20.42%', () => {
    expect(withholdingTax(1000000)).toBe(102100);
    expect(withholdingTax(1500000)).toBe(102100 + 102100);
  });
  it('消費税を区分した請求は税抜の額にかける', () => {
    const r = rewardEntries({ fee: 100000, consumptionTax: 10000, account: '支払手数料' });
    expect(r.tax).toBe(10210);
    expect(r.payment).toBe(99790);
    expect(balanced(r.entry.lines)).toBe(true);
  });
});

describe('消費税の精算', () => {
  it('一般課税: 仮受 − 仮払', () => {
    const r = consumptionTaxSettlement({ received: 150000, paid: 105000, method: 'general' });
    expect(r.payable).toBe(45000);
    expect(r.difference).toBe(0);
    expect(balanced(r.entry.lines)).toBe(true);
  });
  it('簡易課税: 預かった額 × (1 − みなし仕入率)。差は雑益', () => {
    const r = consumptionTaxSettlement({
      received: 150000,
      paid: 105000,
      method: 'simplified',
      businessType: 5,
    });
    expect(r.payable).toBe(75000);
    expect(r.difference).toBe(-30000);
    expect(r.entry.lines).toContainEqual({ side: 'dr', account: '雑損', amount: 30000 });
    expect(balanced(r.entry.lines)).toBe(true);
    const r2 = consumptionTaxSettlement({
      received: 150000,
      paid: 105000,
      method: 'simplified',
      businessType: 2,
    });
    expect(r2.payable).toBe(30000);
    expect(r2.entry.lines).toContainEqual({ side: 'cr', account: '雑益', amount: 15000 });
  });
  it('仮払が多ければ還付（未収入金）', () => {
    const r = consumptionTaxSettlement({ received: 10000, paid: 30000, method: 'general' });
    expect(r.payable).toBe(-20000);
    expect(r.entry.lines).toContainEqual({ side: 'dr', account: '未収入金', amount: 20000 });
  });
});
