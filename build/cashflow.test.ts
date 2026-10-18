import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccountBook } from '../src/lib/content/accounts';
import type { ConsolidationCase, ContentIndex } from '../src/lib/content/schema';
import { buildIndirectCashFlow } from '../src/lib/cashflow/indirect';
import { consolidatedCashFlow } from '../src/lib/consolidation/cashflow';
import { buildContent } from './content';

const { files } = buildContent(path.resolve(import.meta.dirname, '..'));
const index = JSON.parse(files.get('content/index.json')!) as ContentIndex;
const book = new AccountBook(index.accounts);
const load = (id: string) =>
  JSON.parse(files.get(`content/consolidation/${id}.json`)!) as ConsolidationCase;

describe('連結キャッシュ・フロー計算書（国内子会社 2 年目）', () => {
  const cf = consolidatedCashFlow(load('domestic-80-year2'), book)!;

  it('各区分の合計が、現金の増減と一致する', () => {
    expect(cf.openingCash).toBe(1700);
    expect(cf.closingCash).toBe(2200);
    expect(cf.netChange).toBe(500);
  });

  it('営業・財務の内訳', () => {
    // 385 ＋ のれん 10 − 売掛金 100 − 在庫 85 ＋ 買掛金 150
    expect(cf.totals.operating).toBe(360);
    expect(cf.totals.investing).toBe(0);
    // 借入れ 150 − 非支配株主への配当 10
    expect(cf.totals.financing).toBe(140);
    expect(cf.lines.find((l) => l.account === '非支配株主持分')?.amount).toBe(-10);
    expect(cf.lines.find((l) => l.account === '利益剰余金')).toBeUndefined();
  });
});

describe('buildIndirectCashFlow（評価勘定）', () => {
  it('貸倒引当金が増えたら「増加額」として足し戻す', () => {
    const cf = buildIndirectCashFlow({
      opening: new Map([
        ['普通預金', 100],
        ['資本金', -100],
      ]),
      closing: new Map([
        ['普通預金', 100],
        ['売掛金', 50],
        ['貸倒引当金', -5],
        ['資本金', -100],
        ['繰越利益剰余金', -45],
      ]),
      netIncome: 45,
      book,
    });
    const line = cf.lines.find((l) => l.account === '貸倒引当金')!;
    expect(line.label).toBe('貸倒引当金の増加額');
    expect(line.amount).toBe(5);
    expect(cf.netChange).toBe(0);
  });
});

describe('buildIndirectCashFlow（期首が空の帳簿）', () => {
  it('出資・借入れ・利益・在庫の増加から現金の増減を説明する', () => {
    const closing = new Map([
      ['普通預金', 1200],
      ['繰越商品', 300],
      ['資本金', -1000],
      ['借入金', -400],
      ['繰越利益剰余金', -100],
    ]);
    const cf = buildIndirectCashFlow({ opening: new Map(), closing, netIncome: 100, book });
    expect(cf.totals.operating).toBe(100 - 300);
    expect(cf.totals.financing).toBe(1400);
    expect(cf.netChange).toBe(cf.closingCash - cf.openingCash);
  });
});

describe('連結キャッシュ・フロー計算書（米国子会社の設立年）', () => {
  const cf = consolidatedCashFlow(load('us-subsidiary-80'), book)!;
  const line = (account: string) => cf.lines.find((l) => l.account === account)?.amount;

  it('各区分の合計が、現金の増減と一致する', () => {
    expect(cf.openingCash).toBe(150000);
    // P 社 80,000 ＋ S 社 400 千ドル × 140
    expect(cf.closingCash).toBe(136000);
    expect(cf.netChange).toBe(-14000);
  });

  it('S 社の増減は期中平均レートで、資本の払込みは払込み時のレートで数える', () => {
    // P 社 20,000 ＋ S 社 300 千ドル × 145
    expect(line('売掛金')).toBe(-63500);
    expect(line('繰越商品')).toBe(-29000);
    expect(line('買掛金')).toBe(39000);
    expect(line('備品')).toBe(-58000);
    // 非支配株主の払込み 200 千ドル × 150
    expect(line('非支配株主持分')).toBe(30000);
    expect(cf.totals.financing).toBe(70000);
  });

  it('現金及び現金同等物に係る換算差額', () => {
    // S 社の円のキャッシュ・フロー 63,000 と、期末の現金 56,000 の差
    expect(cf.totals.translation).toBe(-7000);
    expect(line('為替換算調整勘定')).toBe(-7000);
  });
});
