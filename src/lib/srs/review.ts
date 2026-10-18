/**
 * 問題の復習の予定（FSRS）。仕訳問題・選択問題・総合演習・レッスンの確認問題が対象。
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

/** 答え合わせのあとに選べる自己評価（正解したときだけ） */
export const SELF_GRADES = [
  { grade: Rating.Hard, label: 'むずかしかった' },
  { grade: Rating.Good, label: 'ふつう' },
  { grade: Rating.Easy, label: 'かんたん' },
] as const;

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

/** いま思い出せる確率（記憶の定着度。0〜1）。まだ一度も復習していなければ null */
export function retrievability(f: ReviewFields, now: number): number | null {
  if (f.last_review === undefined || f.reps === 0) return null;
  return scheduler.get_retrievability(toCard(f), new Date(now), false);
}

/**
 * 記憶の段階（次に忘れるまでの見込み＝安定度で分ける）:
 * 覚えはじめ（7 日未満。間違えた・初めての問題）／ 定着中（7〜21 日）／ 長期記憶（21 日以上）
 */
export type MemoryStage = 'learning' | 'young' | 'mature';

export function memoryStage(f: Pick<ReviewFields, 'stability'>): MemoryStage {
  if (f.stability < 7) return 'learning';
  return f.stability < 21 ? 'young' : 'mature';
}

const dayKey = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** 今日から days 日分の、日ごとの復習の数（期限を過ぎたものは今日に入れる） */
export function forecast(
  records: Pick<ReviewFields, 'due'>[],
  now: number,
  days: number,
): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    out.push({ date: dayKey(d.getTime()), count: 0 });
  }
  const index = new Map(out.map((o, i) => [o.date, i]));
  for (const r of records) {
    const i = isDue(r, now) ? 0 : index.get(dayKey(r.due));
    if (i !== undefined) out[i].count++;
  }
  return out;
}

/** 日付（YYYY-MM-DD）ごとの復習の予定の数（期限を過ぎたものは今日） */
export function dueByDate(records: Pick<ReviewFields, 'due'>[], now: number): Map<string, number> {
  const m = new Map<string, number>();
  const today = dayKey(now);
  for (const r of records) {
    const k = isDue(r, now) ? today : dayKey(r.due);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}
