import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LessonProgress } from '@/lib/db/db';

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
  if (read) await db.activity.add({ at: Date.now(), kind: 'lesson-read', refId: lessonId });
}

/** すべてのレッスンの進み具合（lessonId → 記録） */
export function useLessonProgress(): Map<string, LessonProgress> | undefined {
  return useLiveQuery(async () => {
    const all = await db.lessonProgress.toArray();
    return new Map(all.map((p) => [p.lessonId, p]));
  }, []);
}
