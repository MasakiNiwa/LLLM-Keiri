import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LessonProgress } from '@/lib/db/db';

export async function markLessonOpened(lessonId: string): Promise<void> {
  const now = Date.now();
  const cur = await db.lessonProgress.get(lessonId);
  await db.lessonProgress.put({ ...cur, lessonId, openedAt: now });
}

export async function setLessonRead(lessonId: string, read: boolean): Promise<void> {
  const cur = await db.lessonProgress.get(lessonId);
  await db.lessonProgress.put({
    lessonId,
    openedAt: cur?.openedAt ?? Date.now(),
    readAt: read ? Date.now() : undefined,
  });
}

/** すべてのレッスンの進み具合（lessonId → 記録） */
export function useLessonProgress(): Map<string, LessonProgress> | undefined {
  return useLiveQuery(async () => {
    const all = await db.lessonProgress.toArray();
    return new Map(all.map((p) => [p.lessonId, p]));
  }, []);
}
