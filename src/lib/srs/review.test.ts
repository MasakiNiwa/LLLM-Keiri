import { describe, expect, it } from 'vitest';
import { Rating } from 'ts-fsrs';
import { gradeFor, isDue, schedule } from './review';

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
});
