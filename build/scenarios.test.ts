import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccountBook } from '../src/lib/content/accounts';
import type { ContentIndex } from '../src/lib/content/schema';
import { parseShiwake } from '../src/lib/journal/parse';
import { buildIndirectCashFlow } from '../src/lib/cashflow/indirect';
import {
  buildLedger,
  buildStatements,
  closingBalanceSheet,
  trialBalance,
} from '../src/lib/ledger/ledger';
import { buildContent } from './content';

// 実際の学習データ（content/）を読み込んで確かめる
const { files, errors } = buildContent(path.resolve(import.meta.dirname, '..'));
const index = JSON.parse(files.get('content/index.json')!) as ContentIndex;
const book = new AccountBook(index.accounts);

describe('学習データ', () => {
  it('検証で問題が見つからない', () => {
    expect(errors).toEqual([]);
  });

  it.each(index.scenarios.map((s) => [s.title, s] as const))(
    '帳簿のサンプル「%s」: 試算表と決算書の貸借が一致する',
    (_title, s) => {
      const ledger = buildLedger(
        s.entries.map((e, i) => ({
          id: String(i),
          date: e.date,
          memo: e.memo,
          lines: parseShiwake(e.shiwake).entries[0].lines,
        })),
        book,
      );
      const tb = trialBalance(ledger);
      expect(tb.drTotal).toBe(tb.crTotal);
      const st = buildStatements(ledger);
      expect(st.unsettled).toEqual([]);
      expect(st.totalAssets).toBe(st.totalLiabilities + st.totalEquity + st.netIncome);
      // サンプルは赤字にならないように作っている（決算書の見方の説明が分かりやすいように）
      expect(st.netIncome).toBeGreaterThan(0);
      // キャッシュ・フロー計算書の合計が、現金・預金の増減と一致する
      const cf = buildIndirectCashFlow({
        opening: new Map(),
        closing: closingBalanceSheet(ledger, st.netIncome),
        netIncome: st.netIncome,
        book,
      });
      expect(cf.netChange).toBe(cf.closingCash - cf.openingCash);
    },
  );
});

describe('帳簿のサンプル「小さな会社の 1 か月」', () => {
  const s = index.scenarios.find((x) => x.id === 'office-one-month')!;
  const ledger = buildLedger(
    s.entries.map((e, i) => ({
      id: String(i),
      date: e.date,
      memo: e.memo,
      lines: parseShiwake(e.shiwake).entries[0].lines,
    })),
    book,
  );
  const bal = (a: string) => ledger.find((l) => l.account === a)?.balance ?? 0;

  it('仮払金・未払金は精算で 0 に戻る', () => {
    expect(bal('仮払金')).toBe(0);
    expect(bal('未払金')).toBe(0);
  });

  it('月末の預り金は 5 月分の給料から預かった分だけ残る', () => {
    expect(bal('所得税預り金')).toBe(-7000);
    expect(bal('預り金')).toBe(-12000);
    expect(bal('社会保険料預り金')).toBe(-45000);
    // 会社負担の社会保険料 45,000 ＋ 電気代 18,000
    expect(bal('未払費用')).toBe(-63000);
  });

  it('5 月の損益', () => {
    // 売上 1,200,000 − 仕入 300,000 − 家賃 150,000 − 旅費 49,200 − 手数料 660 − 給料 300,000
    // − 減価償却 10,000 − 法定福利費 45,000 − 電気代 18,000
    expect(buildStatements(ledger).netIncome).toBe(327140);
  });
});

describe('帳簿のサンプル「小さな会社の 1 年」', () => {
  const s = index.scenarios.find((x) => x.id === 'company-first-year')!;
  const ledger = buildLedger(
    s.entries.map((e, i) => ({
      id: String(i),
      date: e.date,
      memo: e.memo,
      lines: parseShiwake(e.shiwake).entries[0].lines,
    })),
    book,
  );
  const bal = (a: string) => ledger.find((l) => l.account === a)?.balance ?? 0;
  it('当期純利益と期末の残高', () => {
    // 売上 16,000,000 − 売上原価 9,400,000 − 家賃 1,200,000 − 給料 3,600,000 − 法定福利費 480,000
    // − 減価償却 200,000 − 貸倒引当金繰入 11,000 − 支払利息 40,000 − 法人税等 320,000
    expect(buildStatements(ledger).netIncome).toBe(749000);
    expect(bal('売掛金')).toBe(1100000);
    expect(bal('仮払消費税等')).toBe(0);
    expect(bal('仮受消費税等')).toBe(0);
    expect(bal('未払消費税等')).toBe(-380000);
    expect(bal('所得税預り金')).toBe(0);
  });
});
