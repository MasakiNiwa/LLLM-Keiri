import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccountBook } from '../src/lib/content/accounts';
import type { ContentIndex } from '../src/lib/content/schema';
import { parseShiwake } from '../src/lib/journal/parse';
import { buildLedger, buildStatements, trialBalance } from '../src/lib/ledger/ledger';
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
    },
  );
});
