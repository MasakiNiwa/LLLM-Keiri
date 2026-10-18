import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccountBook } from '../src/lib/content/accounts';
import type { ConsolidationCase, ContentIndex } from '../src/lib/content/schema';
import { analyze, figures } from '../src/lib/analysis/ratios';
import { consolidate, readTrialBalance } from '../src/lib/consolidation/consolidate';
import { buildContent } from './content';

const { files } = buildContent(path.resolve(import.meta.dirname, '..'));
const index = JSON.parse(files.get('content/index.json')!) as ContentIndex;
const book = new AccountBook(index.accounts);

describe('財務諸表の分析（1 社）', () => {
  const tb = readTrialBalance(
    [
      '普通預金 300 / 買掛金 200',
      '売掛金 200 / 借入金 300',
      '繰越商品 100 / 資本金 400',
      '備品 400 / 利益剰余金 50',
      '売上原価 600 / 売上 1,000',
      '給料 200 /',
      '支払利息 10 /',
      '法人税等 40 /',
      '貸倒引当金繰入 0 /',
    ]
      .filter((l) => !l.includes(' 0 /'))
      .join('\n'),
    book,
  );
  const f = figures(tb, book);
  const r = Object.fromEntries(analyze(tb, book).map((x) => [x.id, x.value]));

  it('利益の段階', () => {
    expect(f.sales.value).toBe(1000);
    expect(f.grossProfit.value).toBe(400);
    expect(f.operatingIncome.value).toBe(200);
    expect(f.ordinaryIncome.value).toBe(190);
    expect(f.netIncome.value).toBe(150);
  });

  it('比率', () => {
    expect(r['gross-margin']).toBe(40);
    expect(r['operating-margin']).toBe(20);
    expect(r['net-margin']).toBe(15);
    // 流動資産 600 ÷ 流動負債 500（借入金は流動負債の科目）
    expect(r['current-ratio']).toBe(120);
    // 当座資産 500 ÷ 500
    expect(r['quick-ratio']).toBe(100);
    // 自己資本 400 ＋ 50 ＋ 150 ＝ 600、総資産 1,000
    expect(r['equity-ratio']).toBe(60);
    expect(r.roe).toBe(25);
    expect(r['asset-turnover']).toBe(1);
  });
});

describe('財務諸表の分析（連結）', () => {
  const c = JSON.parse(files.get('content/consolidation/domestic-80.json')!) as ConsolidationCase;
  const result = consolidate(c, book);
  const balances = new Map(result.ledger.map((l) => [l.account, l.balance]));
  const f = figures(balances, book);

  it('当期純利益は親会社株主に帰属する分、自己資本は非支配株主持分を除く', () => {
    expect(f.netIncome.value).toBe(result.parentNetIncome);
    const nci = -(balances.get('非支配株主持分') ?? 0);
    expect(f.equity.value + nci).toBe(
      result.statements.totalAssets - result.statements.totalLiabilities,
    );
  });
});
