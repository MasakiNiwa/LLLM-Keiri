import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { reviewKey } from '@/features/drill/reviewRepo';
import { db } from '@/lib/db/db';
import { isDue } from '@/lib/srs/review';
import { cn } from '@/lib/utils/cn';
import { LESSON_GRADES, LESSON_REVIEW_SET, reviewLesson } from './progress';

/**
 * レッスンの復習（FSRS）の状態。復習の日なら、読み直したあとに思い出し具合を選べる。
 * まだ読んでいない（予定が無い）レッスンでは何も出さない。
 */
export function LessonReviewPanel({ lessonId }: { lessonId: string }) {
  const card = useLiveQuery(
    () => db.reviews.get(reviewKey(LESSON_REVIEW_SET, lessonId)),
    [lessonId],
  );
  const [now] = useState(() => Date.now());
  const [done, setDone] = useState<number | null>(null);
  if (!card) return null;
  const due = isDue(card, now) && done === null;
  if (!due)
    return (
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <CalendarClock className="size-3.5" />
        次の復習: {new Date(card.due).toLocaleDateString('ja-JP')}（記憶のアルゴリズム FSRS
        が決めた日）
      </p>
    );
  return (
    <div className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
      <p className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-200">
        <CalendarClock className="size-4" />
        今日はこのレッスンの復習の日です
      </p>
      <p className="text-amber-900/80 dark:text-amber-200/80">
        読み直したら、読む前にどれくらい覚えていたかを選んでください。次の復習の日が決まります。
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LESSON_GRADES.map((g) => (
          <button
            key={g.grade}
            type="button"
            onClick={() => {
              setDone(g.grade);
              void reviewLesson(lessonId, g.grade);
            }}
            className={cn(
              'rounded-xl border border-amber-300 bg-white px-3 py-2 font-medium hover:border-accent-400 dark:border-amber-800 dark:bg-slate-900',
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}
