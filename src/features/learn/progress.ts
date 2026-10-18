import { useLiveQuery } from 'dexie-react-hooks';
import type { Grade } from 'ts-fsrs';
import { Rating } from 'ts-fsrs';
import { reviewKey, setReviewGrade } from '@/features/drill/reviewRepo';
import { db, type LessonProgress } from '@/lib/db/db';

/** レッスンの復習の予定の setId（questionId はレッスンの id） */
export const LESSON_REVIEW_SET = 'read';

/** 今日の 0 時 */
function startOfToday(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function markLessonOpened(lessonId: string): Promise<void> {
  const now = Date.now();
  const cur = await db.lessonProgress.get(lessonId);
  await db.lessonProgress.put({ ...cur, lessonId, openedAt: now });
  // 学習の記録には、同じレッスンを 1 日に 1 回だけ残す
  const today = await db.activity
    .where('at')
    .aboveOrEqual(startOfToday(now))
    .filter((a) => a.kind === 'lesson-open' && a.refId === lessonId)
    .count();
  if (!today) await db.activity.add({ at: now, kind: 'lesson-open', refId: lessonId });
}

export async function setLessonRead(lessonId: string, read: boolean): Promise<void> {
  const cur = await db.lessonProgress.get(lessonId);
  await db.lessonProgress.put({
    lessonId,
    openedAt: cur?.openedAt ?? Date.now(),
    readAt: read ? Date.now() : undefined,
  });
  if (!read) return;
  await db.activity.add({ at: Date.now(), kind: 'lesson-read', refId: lessonId });
  // 初めて読んだら、レッスンの復習の予定を作る（読んだことを「覚えた」として始める）
  if (!(await db.reviews.get(reviewKey(LESSON_REVIEW_SET, lessonId))))
    await setReviewGrade(LESSON_REVIEW_SET, lessonId, Rating.Good);
}

/** レッスンを読み直して、どれくらい覚えていたかを付ける（次の復習日が決まる） */
export async function reviewLesson(lessonId: string, grade: Grade): Promise<void> {
  await setReviewGrade(LESSON_REVIEW_SET, lessonId, grade);
  await db.activity.add({ at: Date.now(), kind: 'lesson-review', refId: lessonId, grade });
}

/** レッスンの復習の思い出し具合 */
export const LESSON_GRADES = [
  { grade: Rating.Again, label: '忘れていた' },
  { grade: Rating.Hard, label: 'あやふや' },
  { grade: Rating.Good, label: '覚えていた' },
  { grade: Rating.Easy, label: 'かんたん' },
] as const;

/** すべてのレッスンの進み具合（lessonId → 記録） */
export function useLessonProgress(): Map<string, LessonProgress> | undefined {
  return useLiveQuery(async () => {
    const all = await db.lessonProgress.toArray();
    return new Map(all.map((p) => [p.lessonId, p]));
  }, []);
}
