import { describe, expect, it } from 'vitest';
import { parseAmount } from './amount';
import { isBalanced, pairRows } from './balance';
import { formatShiwake, parseShiwake } from './parse';

describe('parseAmount', () => {
  it('いろいろな書き方の金額を読む', () => {
    expect(parseAmount('100,000')).toBe(100000);
    expect(parseAmount('１００，０００')).toBe(100000);
    expect(parseAmount('¥5,000円')).toBe(5000);
    expect(parseAmount('10万')).toBe(100000);
    expect(parseAmount('1万2,000')).toBe(12000);
    expect(parseAmount('1.5万')).toBe(15000);
    expect(parseAmount('3千')).toBe(3000);
    expect(parseAmount('2億')).toBe(200000000);
    expect(parseAmount('△300')).toBe(-300);
  });
  it('読めないものは null', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('万')).toBeNull();
    expect(parseAmount('1.5')).toBeNull();
  });
});

describe('parseShiwake', () => {
  it('説明・複数行・片側だけの行を読む', () => {
    const { entries, issues } = parseShiwake(
      [
        '# 商品を掛けで仕入れた',
        '仕入 100,000 / 買掛金 110,000',
        '仮払消費税等 10,000 /',
        '',
        '現金　５０，０００ ／ 売上 50,000',
      ].join('\n'),
    );
    expect(issues).toEqual([]);
    expect(entries).toHaveLength(2);
    expect(entries[0].caption).toBe('商品を掛けで仕入れた');
    expect(entries[0].lines).toEqual([
      { side: 'dr', account: '仕入', amount: 100000 },
      { side: 'cr', account: '買掛金', amount: 110000 },
      { side: 'dr', account: '仮払消費税等', amount: 10000 },
    ]);
    expect(isBalanced(entries[0])).toBe(true);
    expect(entries[1].lines[0]).toEqual({ side: 'dr', account: '現金', amount: 50000 });
  });

  it('読めない行は問題として返す', () => {
    const { issues } = parseShiwake('仕入 100,000 買掛金 100,000\n仕入 / 買掛金 100');
    expect(issues.map((i) => i.line)).toEqual([1, 2]);
  });

  it('科目名に空白を含んでもよい（最後の空白で金額と分ける）', () => {
    const { entries } = parseShiwake('リース 債務 1,000 / 現金 1,000');
    expect(entries[0].lines[0].account).toBe('リース 債務');
  });

  it('書き方に戻せる', () => {
    const text = '# 例\n仕入 100,000 / 買掛金 110,000\n仮払消費税等 10,000 /';
    const { entries } = parseShiwake(text);
    expect(formatShiwake(entries[0])).toBe(text);
    expect(pairRows(entries[0].lines)).toHaveLength(2);
  });
});
