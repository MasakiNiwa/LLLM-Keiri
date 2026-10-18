import { describe, expect, it } from 'vitest';
import { collectionEntry, payrollEntries } from './entries';

const sum = (lines: { side: string; amount: number }[], side: string) =>
  lines.filter((l) => l.side === side).reduce((s, l) => s + l.amount, 0);

describe('給料の仕訳', () => {
  const r = payrollEntries({
    gross: 300000,
    incomeTax: 7000,
    residentTax: 12000,
    socialInsurance: 45000,
  });
  it('手取りと、貸借の一致', () => {
    expect(r.netPay).toBe(236000);
    for (const e of [r.payday, r.taxPayment!, r.socialPayment!])
      expect(sum(e.lines, 'dr')).toBe(sum(e.lines, 'cr'));
  });
  it('社会保険料は会社の負担分を法定福利費にする', () => {
    expect(r.socialPayment!.lines).toContainEqual({
      side: 'dr',
      account: '法定福利費',
      amount: 45000,
    });
    expect(r.socialPayment!.lines).toContainEqual({
      side: 'cr',
      account: '普通預金',
      amount: 90000,
    });
  });
  it('0 の項目は仕訳に出さない', () => {
    const r2 = payrollEntries({ gross: 100000, incomeTax: 0, residentTax: 0, socialInsurance: 0 });
    expect(r2.payday.lines).toHaveLength(2);
    expect(r2.taxPayment).toBeNull();
    expect(r2.socialPayment).toBeNull();
  });
  it('差し引く額が多すぎるとエラー', () => {
    expect(
      payrollEntries({ gross: 10, incomeTax: 20, residentTax: 0, socialInsurance: 0 }).error,
    ).toBeTruthy();
  });
});

describe('入金消込', () => {
  it('当社負担の手数料は支払手数料', () => {
    const r = collectionEntry({ billed: 110000, received: 109560, reason: 'fee-self' });
    expect(r.entry!.lines).toContainEqual({ side: 'dr', account: '支払手数料', amount: 440 });
    expect(r.remaining).toBe(0);
  });
  it('得意先負担なら売掛金を残す', () => {
    const r = collectionEntry({ billed: 110000, received: 109560, reason: 'fee-customer' });
    expect(r.remaining).toBe(440);
    expect(r.entry!.lines).toContainEqual({ side: 'cr', account: '売掛金', amount: 109560 });
  });
  it('大きな差は一部入金', () => {
    expect(collectionEntry({ billed: 100000, received: 60000, reason: 'partial' }).remaining).toBe(
      40000,
    );
  });
  it('多い入金は預り金', () => {
    const r = collectionEntry({ billed: 100000, received: 100500, reason: 'fee-self' });
    expect(r.entry!.lines).toContainEqual({ side: 'cr', account: '預り金', amount: 500 });
  });
});
