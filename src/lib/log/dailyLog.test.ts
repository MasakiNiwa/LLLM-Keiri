import { describe, expect, it } from 'vitest';
import { buildDailyLog, dayScore, streak } from './dailyLog';

const t = (s: string) => new Date(s).getTime();

describe('学習の記録', () => {
  const days = buildDailyLog({
    activity: [
      { at: t('2026-10-16T09:00:00'), kind: 'lesson-open', refId: 'a' },
      { at: t('2026-10-16T09:30:00'), kind: 'lesson-read', refId: 'a' },
      { at: t('2026-10-17T21:00:00'), kind: 'lesson-open', refId: 'b' },
    ],
    lessonProgress: [{ lessonId: 'c', openedAt: 0, readAt: t('2026-10-15T08:00:00') }],
    attempts: [
      {
        setId: 's',
        questionId: 'q1',
        correct: true,
        revealed: false,
        kind: 'exact',
        at: t('2026-10-17T21:10:00'),
      },
      {
        setId: 's',
        questionId: 'q2',
        correct: false,
        revealed: false,
        kind: 'x',
        at: t('2026-10-17T21:11:00'),
      },
    ],
    journal: [
      { id: 'j', date: '2026-10-18', memo: '', lines: [], createdAt: t('2026-10-18T10:00:00') },
    ],
    chat: [
      { id: 'c1', role: 'user', text: 'q', createdAt: t('2026-10-18T11:00:00') },
      { id: 'c2', role: 'assistant', text: 'a', createdAt: t('2026-10-18T11:00:05') },
    ],
  });

  it('日付ごとにまとめる', () => {
    expect(days.get('2026-10-16')).toMatchObject({ lessonsRead: ['a'], lessonsOpened: [] });
    expect(days.get('2026-10-15')?.lessonsRead).toEqual(['c']);
    expect(days.get('2026-10-17')).toMatchObject({
      lessonsOpened: ['b'],
      attempts: 2,
      correct: 1,
      drills: [{ setId: 's', tried: 2, correct: 1 }],
    });
    expect(days.get('2026-10-18')).toMatchObject({ journal: 1, questions: 1 });
    expect(dayScore(days.get('2026-10-17'))).toBe(3);
  });

  it('連続学習日数', () => {
    expect(streak(days, new Date('2026-10-18T20:00:00'))).toBe(4);
    // 今日まだ学習していなければ昨日から数える
    expect(streak(days, new Date('2026-10-19T08:00:00'))).toBe(4);
    expect(streak(days, new Date('2026-10-21T08:00:00'))).toBe(0);
  });
});
