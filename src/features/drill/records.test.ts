import { describe, expect, it } from 'vitest';
import { summarize } from './records';

describe('summarize', () => {
  it('問題ごとに最後の答え合わせで数える（答えを見てからの正解は数えない）', () => {
    const s = summarize([
      { setId: 's', questionId: 'q1', correct: false, revealed: false, kind: 'account', at: 1 },
      { setId: 's', questionId: 'q1', correct: true, revealed: false, kind: 'correct', at: 2 },
      { setId: 's', questionId: 'q2', correct: true, revealed: true, kind: 'correct', at: 3 },
      { setId: 't', questionId: 'q1', correct: true, revealed: false, kind: 'correct', at: 4 },
    ]);
    expect(s.get('s')).toEqual({ tried: 2, correct: 1, lastAt: 3 });
    expect(s.get('t')?.correct).toBe(1);
  });
});
