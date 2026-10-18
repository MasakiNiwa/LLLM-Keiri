import { describe, expect, it } from 'vitest';
import { disposalEntry } from './disposal';

describe('固定資産の期中の売却', () => {
  it('売却損', () => {
    // 600,000 ÷ 5 年 ＝ 120,000。期首まで 2 年で 240,000、当期 6 か月で 60,000。帳簿価額 300,000
    const r = disposalEntry({
      account: '備品',
      cost: 600000,
      life: 5,
      yearsUsed: 2,
      months: 6,
      price: 250000,
    });
    expect(r.accumulated).toBe(240000);
    expect(r.current).toBe(60000);
    expect(r.bookValue).toBe(300000);
    expect(r.gain).toBe(-50000);
    expect(r.entry.lines).toContainEqual({ side: 'dr', account: '固定資産売却損', amount: 50000 });
  });
  it('売却益と貸借の一致', () => {
    const r = disposalEntry({
      account: '車両運搬具',
      cost: 1000000,
      life: 4,
      yearsUsed: 3,
      months: 3,
      price: 100000,
    });
    expect(r.bookValue).toBe(1000000 - 750000 - 62500);
    expect(r.gain).toBe(100000 - 187500);
    const sum = (s: string) =>
      r.entry.lines.filter((l) => l.side === s).reduce((a, l) => a + l.amount, 0);
    expect(sum('dr')).toBe(sum('cr'));
    const r2 = disposalEntry({
      account: '備品',
      cost: 600000,
      life: 5,
      yearsUsed: 2,
      months: 6,
      price: 320000,
    });
    expect(r2.entry.lines).toContainEqual({ side: 'cr', account: '固定資産売却益', amount: 20000 });
  });
  it('使った期間が耐用年数を超えるとエラー', () => {
    expect(
      disposalEntry({ account: '備品', cost: 1, life: 1, yearsUsed: 1, months: 1, price: 0 }).error,
    ).toBeTruthy();
  });
});
