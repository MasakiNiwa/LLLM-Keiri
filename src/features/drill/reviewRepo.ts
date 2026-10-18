import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ReviewRecord } from '@/lib/db/db';
import { gradeFor, isDue, schedule } from '@/lib/srs/review';

export const reviewKey = (setId: string, questionId: string) => `${setId}\u0000${questionId}`;

/** 答え合わせの結果で、その問題の次の復習日を決める（最初の答え合わせだけを使う） */
export async function updateReview(
  setId: string,
  questionId: string,
  correct: boolean,
  revealed: boolean,
): Promise<void> {
  const key = reviewKey(setId, questionId);
  const now = Date.now();
  await db.transaction('rw', db.reviews, async () => {
    const prev = await db.reviews.get(key);
    const fields = schedule(prev, gradeFor(correct, revealed), now);
    await db.reviews.put({ ...fields, key, setId, questionId, updatedAt: now });
  });
}

export interface ReviewSummary {
  /** 今日の復習（期限が今日まで） */
  due: ReviewRecord[];
  /** 次の予定（今日の分がないとき） */
  next?: number;
  total: number;
}

export function useReviewSummary(): ReviewSummary | undefined {
  return useLiveQuery(async () => {
    const all = await db.reviews.orderBy('due').toArray();
    const now = Date.now();
    const due = all.filter((r) => isDue(r, now));
    return { due, next: all.find((r) => !isDue(r, now))?.due, total: all.length };
  }, []);
}
