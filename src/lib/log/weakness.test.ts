import { describe, expect, it } from 'vitest';
import type { DrillAttempt } from '../db/db';
import { analyzeWeakness, type SetInfo } from './weakness';

const a = (
  setId: string,
  questionId: string,
  correct: boolean,
  at: number,
  kind = 'exact',
  revealed = false,
): DrillAttempt => ({
  setId,
  questionId,
  correct,
  revealed,
  kind,
  at,
});

const sets = new Map<string, SetInfo>([
  [
    'tax',
    {
      track: 'tax',
      accounts: new Map([
        ['q1', ['仮払消費税等', '仕入', '買掛金']],
        ['q2', ['仮受消費税等', '売上', '売掛金']],
      ]),
    },
  ],
  ['basics', { track: 'basics', accounts: new Map([['q1', ['現金', '売上']]]) }],
  ['quiz:jsox', { track: 'internal-control', accounts: new Map() }],
]);

describe('苦手の分析', () => {
  const w = analyzeWeakness(
    [
      a('tax', 'q1', false, 1, 'swapped'),
      a('tax', 'q1', true, 2), // 最後は正解
      a('tax', 'q2', false, 3, 'account'),
      a('basics', 'q1', true, 4, 'exact', true), // 答えを見た
      a('quiz:jsox', 'q1', false, 5, 'choice'),
      a('unknown', 'q1', false, 6),
    ],
    sets,
  );
  it('問題ごとに最後の結果で、分野の正解率', () => {
    expect(w.tried).toBe(4);
    expect(w.tracks.map((t) => [t.track, t.rate])).toEqual([
      ['basics', 0],
      ['internal-control', 0],
      ['tax', 50],
    ]);
  });
  it('間違えやすい科目と間違いの種類', () => {
    expect(w.accounts.map((s) => s.account)).toEqual(
      expect.arrayContaining(['仮受消費税等', '売上', '売掛金', '現金']),
    );
    expect(w.accounts.find((s) => s.account === '売上')).toMatchObject({ wrong: 2, tried: 2 });
    expect(w.accounts.find((s) => s.account === '仕入')).toBeUndefined();
    expect(w.kinds).toEqual({ account: 1, revealed: 1, choice: 1 });
  });
});
