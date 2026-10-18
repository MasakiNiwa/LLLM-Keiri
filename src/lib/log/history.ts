/**
 * 学習対象（レッスン・問題セット・演習）ごとの履歴（プログラムが集計する）。
 * レッスンは、開いた・読んだ・復習した記録と、その中の確認問題（setId が lesson:<id>）をまとめる。
 */
import type { ActivityRecord, DrillAttempt, LessonProgress, ReviewRecord } from '../db/db.ts';
import { dateKey } from './dailyLog.ts';

export type HistoryEvent =
  | { at: number; type: 'open' | 'read' }
  | { at: number; type: 'review'; grade: number }
  | {
      at: number;
      type: 'attempt';
      questionId: string;
      correct: boolean;
      revealed: boolean;
    };

export interface HistoryDay {
  date: string;
  opened: boolean;
  read: boolean;
  /** レッスンの復習の自己評価（その日の最後のもの） */
  reviewGrade?: number;
  attempts: number;
  correct: number;
  /** その日に答え合わせした問題（問題ごとの最後の結果） */
  questions: { questionId: string; correct: boolean; revealed: boolean }[];
}

export interface TargetHistory {
  /** lesson:<id> ／ quiz:<id> ／ exercise:<id> ／ 問題セットの id */
  id: string;
  kind: 'lesson' | 'questions';
  /** 学習した日数（学習の回数） */
  days: number;
  firstAt: number;
  lastAt: number;
  attempts: number;
  /** 問題ごとの最後の答え合わせで、答えを見ずに正解した数 / 答え合わせした問題の数 */
  correctNow: number;
  triedQuestions: number;
  /** 次の復習の日（レッスン・問題のうち一番早いもの） */
  nextDue?: number;
  /** 復習の予定がある数 */
  reviewCards: number;
  /** 新しい日付から並べた日ごとの記録 */
  log: HistoryDay[];
}

const targetOfSet = (setId: string) => setId;
const targetOfLesson = (lessonId: string) => `lesson:${lessonId}`;

export function buildHistory(input: {
  activity: ActivityRecord[];
  lessonProgress: LessonProgress[];
  attempts: DrillAttempt[];
  reviews: ReviewRecord[];
}): Map<string, TargetHistory> {
  const events = new Map<string, HistoryEvent[]>();
  const push = (id: string, e: HistoryEvent) => {
    const xs = events.get(id) ?? [];
    xs.push(e);
    events.set(id, xs);
  };
  for (const a of input.activity) {
    const id = targetOfLesson(a.refId);
    if (a.kind === 'lesson-review') push(id, { at: a.at, type: 'review', grade: a.grade ?? 3 });
    else push(id, { at: a.at, type: a.kind === 'lesson-read' ? 'read' : 'open' });
  }
  // 記録を始める前に読んだレッスン（読んだ印だけがある）
  for (const p of input.lessonProgress) {
    const id = targetOfLesson(p.lessonId);
    if (p.readAt && !(events.get(id) ?? []).some((e) => e.type === 'read'))
      push(id, { at: p.readAt, type: 'read' });
  }
  for (const a of input.attempts)
    push(targetOfSet(a.setId), {
      at: a.at,
      type: 'attempt',
      questionId: a.questionId,
      correct: a.correct,
      revealed: a.revealed,
    });

  const cards = new Map<string, ReviewRecord[]>();
  for (const r of input.reviews) {
    const id = r.setId === 'read' ? targetOfLesson(r.questionId) : targetOfSet(r.setId);
    cards.set(id, [...(cards.get(id) ?? []), r]);
  }

  const out = new Map<string, TargetHistory>();
  for (const [id, xs] of events) {
    xs.sort((a, b) => a.at - b.at);
    const days = new Map<string, HistoryDay>();
    const latest = new Map<string, { correct: boolean; revealed: boolean }>();
    let attempts = 0;
    for (const e of xs) {
      const k = dateKey(e.at);
      let d = days.get(k);
      if (!d) {
        d = { date: k, opened: false, read: false, attempts: 0, correct: 0, questions: [] };
        days.set(k, d);
      }
      if (e.type === 'open') d.opened = true;
      else if (e.type === 'read') d.read = true;
      else if (e.type === 'review') d.reviewGrade = e.grade;
      else if (e.type === 'attempt') {
        attempts++;
        d.attempts++;
        if (e.correct && !e.revealed) d.correct++;
        const q = { questionId: e.questionId, correct: e.correct, revealed: e.revealed };
        const i = d.questions.findIndex((x) => x.questionId === e.questionId);
        if (i >= 0) d.questions[i] = q;
        else d.questions.push(q);
        latest.set(e.questionId, q);
      }
    }
    const cs = cards.get(id) ?? [];
    out.set(id, {
      id,
      kind: id.startsWith('lesson:') ? 'lesson' : 'questions',
      days: days.size,
      firstAt: xs[0].at,
      lastAt: xs[xs.length - 1].at,
      attempts,
      correctNow: [...latest.values()].filter((q) => q.correct && !q.revealed).length,
      triedQuestions: latest.size,
      nextDue: cs.length ? Math.min(...cs.map((c) => c.due)) : undefined,
      reviewCards: cs.length,
      log: [...days.values()].reverse(),
    });
  }
  return out;
}
