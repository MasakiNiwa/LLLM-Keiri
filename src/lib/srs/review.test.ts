import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import {
  dueByDate,
  forecast,
  gradeFor,
  isDue,
  memoryStage,
  retrievability,
  schedule,
} from './review';

const DAY = 86_400_000;
const now = new Date('2026-10-19T10:00:00').getTime();

describe('review', () => {
  it('答えを見ずに正解なら Good、それ以外は Again', () => {
    expect(gradeFor(true, false)).toBe(Rating.Good);
    expect(gradeFor(true, true)).toBe(Rating.Again);
    expect(gradeFor(false, false)).toBe(Rating.Again);
  });

  it('間違えた問題は近いうちに、正解した問題は先に出す', () => {
    const wrong = schedule(undefined, Rating.Again, now);
    const right = schedule(undefined, Rating.Good, now);
    expect(wrong.due).toBeLessThan(right.due);
    expect(wrong.due - now).toBeLessThanOrEqual(2 * DAY);
    // 続けて正解すると間隔がのびる
    const again = schedule(right, Rating.Good, right.due);
    expect(again.due - right.due).toBeGreaterThan(right.due - now);
  });

  it('その日のうちの予定は今日の復習に入る', () => {
    expect(isDue({ due: now + 3 * 3_600_000 }, now)).toBe(true);
    expect(isDue({ due: now + DAY }, now)).toBe(false);
  });

  it('記憶の定着度は、復習の日に近づくほど下がる（予定日にはおよそ 90%）', () => {
    const r = schedule(schedule(undefined, Rating.Good, now), Rating.Good, now + 3 * DAY);
    expect(retrievability(schedule(undefined, Rating.Good, now), now)).not.toBeNull();
    const soon = retrievability(r, r.last_review! + DAY)!;
    const atDue = retrievability(r, r.due)!;
    expect(soon).toBeGreaterThan(atDue);
    expect(atDue).toBeGreaterThan(0.8);
    expect(atDue).toBeLessThan(0.97);
  });

  it('記憶の段階（安定度で分ける）', () => {
    expect(memoryStage({ stability: 1 })).toBe('learning');
    expect(memoryStage({ stability: 10 })).toBe('young');
    expect(memoryStage({ stability: 30 })).toBe('mature');
    // 初めて間違えた問題は覚えはじめ
    expect(memoryStage(schedule(undefined, Rating.Again, now))).toBe('learning');
  });

  it('14 日の予定（期限を過ぎたものは今日）', () => {
    const f = forecast(
      [{ due: now - 5 * DAY }, { due: now + 1000 }, { due: now + 2 * DAY }],
      now,
      14,
    );
    expect(f).toHaveLength(14);
    expect(f[0].count).toBe(2);
    expect(f[2].count).toBe(1);
    const m = dueByDate([{ due: now - DAY }, { due: now + 2 * DAY }], now);
    expect(m.get('2026-10-19')).toBe(1);
    expect(m.get('2026-10-21')).toBe(1);
  });
});
