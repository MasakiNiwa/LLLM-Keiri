/**
 * 学習の記録を日付ごとにまとめる（プログラムが集計する）。
 * レッスン（開いた・読んだ）、問題の答え合わせ、帳簿の仕訳、AI への質問を、端末の日付（ローカル時刻）で分ける。
 */
import type {
  ActivityRecord,
  ChatRecord,
  DrillAttempt,
  JournalRecord,
  LessonProgress,
} from '../db/db.ts';

export interface DayLog {
  /** YYYY-MM-DD */
  date: string;
  lessonsOpened: string[];
  lessonsRead: string[];
  /** 問題セット（setId）ごとの答え合わせ */
  drills: { setId: string; tried: number; correct: number }[];
  attempts: number;
  correct: number;
  journal: number;
  questions: number;
}

export function dateKey(at: number): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildDailyLog(input: {
  activity: ActivityRecord[];
  lessonProgress: LessonProgress[];
  attempts: DrillAttempt[];
  journal: JournalRecord[];
  chat: ChatRecord[];
}): Map<string, DayLog> {
  const days = new Map<string, DayLog>();
  const day = (at: number) => {
    const k = dateKey(at);
    let d = days.get(k);
    if (!d) {
      d = {
        date: k,
        lessonsOpened: [],
        lessonsRead: [],
        drills: [],
        attempts: 0,
        correct: 0,
        journal: 0,
        questions: 0,
      };
      days.set(k, d);
    }
    return d;
  };
  const addUnique = (xs: string[], x: string) => {
    if (!xs.includes(x)) xs.push(x);
  };
  for (const a of input.activity) {
    const d = day(a.at);
    addUnique(a.kind === 'lesson-read' ? d.lessonsRead : d.lessonsOpened, a.refId);
  }
  // 記録を始める前に読んだレッスンは、読んだ印の日時から
  for (const p of input.lessonProgress)
    if (p.readAt) addUnique(day(p.readAt).lessonsRead, p.lessonId);
  for (const a of input.attempts) {
    const d = day(a.at);
    d.attempts++;
    if (a.correct) d.correct++;
    let s = d.drills.find((x) => x.setId === a.setId);
    if (!s) d.drills.push((s = { setId: a.setId, tried: 0, correct: 0 }));
    s.tried++;
    if (a.correct) s.correct++;
  }
  for (const j of input.journal) day(j.createdAt).journal++;
  for (const c of input.chat) if (c.role === 'user') day(c.createdAt).questions++;
  // 読んだレッスンは「開いた」にも重ねて出さない
  for (const d of days.values())
    d.lessonsOpened = d.lessonsOpened.filter((x) => !d.lessonsRead.includes(x));
  return days;
}

/** その日の学習の量（カレンダーの色の濃さに使う） */
export function dayScore(d: DayLog | undefined): number {
  if (!d) return 0;
  return d.lessonsOpened.length + d.lessonsRead.length * 2 + d.attempts + d.journal + d.questions;
}

/** 今日（または昨日）までの連続学習日数 */
export function streak(days: Map<string, DayLog>, today: Date = new Date()): number {
  const d = new Date(today);
  d.setHours(12, 0, 0, 0);
  // 今日まだ学習していなければ、昨日から数える
  if (!days.has(dateKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dateKey(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
