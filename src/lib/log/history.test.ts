import { describe, expect, it } from 'vitest';
import { buildHistory } from './history';

const at = (d: string, h = 10) => new Date(`${d}T${String(h).padStart(2, '0')}:00:00`).getTime();

describe('学習対象ごとの履歴', () => {
  const h = buildHistory({
    activity: [
      { at: at('2026-10-01'), kind: 'lesson-open', refId: 'a' },
      { at: at('2026-10-01', 11), kind: 'lesson-read', refId: 'a' },
      { at: at('2026-10-05'), kind: 'lesson-review', refId: 'a', grade: 2 },
    ],
    lessonProgress: [{ lessonId: 'b', openedAt: at('2026-09-01'), readAt: at('2026-09-01') }],
    attempts: [
      {
        setId: 'lesson:a',
        questionId: 'qx',
        correct: false,
        revealed: false,
        kind: 'k',
        at: at('2026-10-01', 12),
      },
      {
        setId: 'quiz:s',
        questionId: 'q1',
        correct: false,
        revealed: false,
        kind: 'k',
        at: at('2026-10-02'),
      },
      {
        setId: 'quiz:s',
        questionId: 'q1',
        correct: true,
        revealed: false,
        kind: 'k',
        at: at('2026-10-03'),
      },
      {
        setId: 'quiz:s',
        questionId: 'q2',
        correct: true,
        revealed: true,
        kind: 'k',
        at: at('2026-10-03', 11),
      },
    ],
    reviews: [
      {
        key: 'read\u0000a',
        setId: 'read',
        questionId: 'a',
        due: at('2026-10-20'),
        stability: 1,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 1,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
        updatedAt: 0,
      },
      {
        key: 'quiz:s\u0000q1',
        setId: 'quiz:s',
        questionId: 'q1',
        due: at('2026-10-15'),
        stability: 1,
        difficulty: 5,
        elapsed_days: 0,
        scheduled_days: 1,
        learning_steps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
        updatedAt: 0,
      },
    ],
  });
  it('レッスン: 開いた・読んだ・復習・確認問題をまとめる', () => {
    const a = h.get('lesson:a')!;
    expect(a.kind).toBe('lesson');
    expect(a.days).toBe(2);
    expect(a.log[0]).toMatchObject({ date: '2026-10-05', reviewGrade: 2 });
    expect(a.log[1]).toMatchObject({ date: '2026-10-01', opened: true, read: true, attempts: 1 });
    expect(a.nextDue).toBe(at('2026-10-20'));
  });
  it('読んだ印だけのレッスンも出す', () => {
    expect(h.get('lesson:b')!.log[0].read).toBe(true);
  });
  it('問題セット: 回数・問題ごとの最後の結果・次の復習', () => {
    const s = h.get('quiz:s')!;
    expect(s.days).toBe(2);
    expect(s.attempts).toBe(3);
    // q1 は最後に正解、q2 は答えを見たので数えない
    expect(s.correctNow).toBe(1);
    expect(s.triedQuestions).toBe(2);
    expect(s.nextDue).toBe(at('2026-10-15'));
    expect(s.log[0].questions).toHaveLength(2);
  });
});
