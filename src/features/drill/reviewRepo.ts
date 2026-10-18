import { useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Grade } from 'ts-fsrs';
import { db, type ReviewRecord } from '@/lib/db/db';
import { gradeFor, isDue, schedule, type ReviewFields } from '@/lib/srs/review';

export const reviewKey = (setId: string, questionId: string) => `${setId}\u0000${questionId}`;

/**
 * 答え合わせの結果で、その問題の次の復習日を決める（その画面での最初の答え合わせだけを使う）。
 * 自己評価で付け直せるように、更新前の状態を返す。
 */
export async function updateReview(
  setId: string,
  questionId: string,
  correct: boolean,
  revealed: boolean,
): Promise<ReviewFields | undefined> {
  return setReviewGrade(setId, questionId, gradeFor(correct, revealed));
}

/** 評価を指定して次の復習日を決める。prev を渡すと、その状態からやり直す（自己評価の付け直し） */
export async function setReviewGrade(
  setId: string,
  questionId: string,
  grade: Grade,
  prev?: ReviewFields | null,
): Promise<ReviewFields | undefined> {
  const key = reviewKey(setId, questionId);
  const now = Date.now();
  return db.transaction('rw', db.reviews, async () => {
    const before = prev === undefined ? await db.reviews.get(key) : (prev ?? undefined);
    const fields = schedule(before, grade, now);
    await db.reviews.put({ ...fields, key, setId, questionId, updatedAt: now });
    if (!before) return undefined;
    const { key: _k, setId: _s, questionId: _q, updatedAt: _u, ...rest } = before as ReviewRecord;
    return rest;
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

/** すべての復習の記録（予定・定着度の表示用） */
export function useReviewRecords(): ReviewRecord[] | undefined {
  return useLiveQuery(() => db.reviews.toArray(), []);
}

/** その画面で最初に答え合わせした結果だけを復習の予定に使う */
export function useReviewOnce(
  setId: string,
): (questionId: string, correct: boolean, revealed: boolean) => void {
  const done = useRef(new Set<string>());
  return useCallback(
    (questionId, correct, revealed) => {
      if (done.current.has(questionId)) return;
      done.current.add(questionId);
      void updateReview(setId, questionId, correct, revealed);
    },
    [setId],
  );
}
