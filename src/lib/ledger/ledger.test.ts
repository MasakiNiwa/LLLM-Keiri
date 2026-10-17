import { describe, expect, it } from 'vitest';
import { AccountBook } from '../content/accounts';
import type { Account } from '../content/schema';
import { parseShiwake } from '../journal/parse';
import { buildLedger, buildStatements, trialBalance, type LedgerEntry } from './ledger';

const acc = (name: string, element: Account['element'], contra = false): Account => ({
  name,
  kana: name,
  element,
  group: 'g',
  contra,
  aliases: name === '売掛金' ? ['売掛'] : [],
  description: 'd',
  examples: [],
  related: [],
  level: 1,
});

const book = new AccountBook([
  acc('現金', 'asset'),
  acc('売掛金', 'asset'),
  acc('備品', 'asset'),
  acc('減価償却累計額', 'asset', true),
  acc('買掛金', 'liability'),
  acc('資本金', 'equity'),
  acc('売上', 'revenue'),
  acc('仕入', 'expense'),
  acc('減価償却費', 'expense'),
]);

let n = 0;
const entry = (date: string, text: string): LedgerEntry => ({
  id: String(++n),
  date,
  memo: '',
  lines: parseShiwake(text).entries[0].lines,
});

const entries = [
  entry('2026-04-01', '現金 500,000 / 資本金 500,000'),
  entry('2026-04-05', '仕入 80,000 / 買掛金 80,000'),
  entry('2026-04-03', '備品 100,000 / 現金 100,000'),
  entry('2026-04-10', '現金 50,000 / 売上 120,000\n売掛 70,000 /'),
  entry('2026-04-30', '減価償却費 10,000 / 減価償却累計額 10,000'),
];

describe('buildLedger', () => {
  const ledger = buildLedger(entries, book);
  it('区分・マスタの順に並べ、別名は正式な科目にまとめる', () => {
    expect(ledger.map((l) => l.account)).toEqual([
      '現金',
      '売掛金',
      '備品',
      '減価償却累計額',
      '買掛金',
      '資本金',
      '売上',
      '仕入',
      '減価償却費',
    ]);
  });
  it('日付順に転記し、相手科目（複数なら諸口）を記録する', () => {
    const cash = ledger.find((l) => l.account === '現金')!;
    expect(cash.debits.map((p) => [p.date, p.counterpart, p.amount])).toEqual([
      ['2026-04-01', '資本金', 500000],
      ['2026-04-10', '売上', 50000],
    ]);
    expect(cash.credits[0].counterpart).toBe('備品');
    expect(cash.balance).toBe(450000);
    const sales = ledger.find((l) => l.account === '売上')!;
    expect(sales.credits[0].counterpart).toBe('諸口');
  });
  it('試算表の貸借が一致する', () => {
    const tb = trialBalance(ledger);
    expect(tb.drTotal).toBe(tb.crTotal);
    expect(tb.drBalance).toBe(tb.crBalance);
  });
  it('決算書: 評価勘定はマイナス、当期純利益を含めて貸借が一致する', () => {
    const s = buildStatements(ledger);
    expect(s.assets.find((a) => a.account === '減価償却累計額')?.amount).toBe(-10000);
    expect(s.netIncome).toBe(120000 - 80000 - 10000);
    expect(s.totalAssets).toBe(s.totalLiabilities + s.totalEquity + s.netIncome);
  });
});
