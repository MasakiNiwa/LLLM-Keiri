/**
 * 仕訳問題の復習の予定（FSRS）。
 * 「いつ復習するか」は LLM ではなくこのアルゴリズム（ts-fsrs）が決める。
 *
 * 問題を答え合わせしたら、最初の答え合わせの結果で評価する:
 * - 答えを見ずに正解 → Good（間隔をのばす）
 * - 間違えた・答えを見た → Again（近いうちにもう一度）
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';

/** 保存する復習の状態（日時はミリ秒） */
export interface ReviewFields {
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: number;
}

// 1 日単位で「今日の復習」に出すので、分単位の短期ステップは使わない
const scheduler = fsrs(
  generatorParameters({ request_retention: 0.9, enable_fuzz: true, enable_short_term: false }),
);

function toCard(f: ReviewFields): Card {
  return {
    ...f,
    due: new Date(f.due),
    last_review: f.last_review !== undefined ? new Date(f.last_review) : undefined,
  } as Card;
}

function fromCard(c: Card): ReviewFields {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review?.getTime(),
  };
}

/** 答え合わせの結果から評価を決める */
export function gradeFor(correct: boolean, revealed: boolean): Grade {
  return correct && !revealed ? Rating.Good : Rating.Again;
}

/** 評価を反映した次の予定（初めての問題なら新しく作る） */
export function schedule(prev: ReviewFields | undefined, grade: Grade, now: number): ReviewFields {
  const card = prev ? toCard(prev) : createEmptyCard(new Date(now));
  return fromCard(scheduler.next(card, new Date(now), grade).card);
}

/** 復習の日（その日の終わりまでに来る予定は「今日の復習」に入れる） */
export function isDue(f: Pick<ReviewFields, 'due'>, now: number): boolean {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return f.due <= end.getTime();
}
