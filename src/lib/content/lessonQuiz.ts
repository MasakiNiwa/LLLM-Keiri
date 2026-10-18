/**
 * レッスンの中の確認問題（` ```quiz `）を、復習の記録のために id で引けるようにする。
 * id は問題文から作る（問題文を変えると別の問題として扱う）。
 */
import { QuizSchema, type Quiz } from './schema.ts';

export function parseQuiz(json: string): Quiz | null {
  try {
    const r = QuizSchema.safeParse(JSON.parse(json));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** 問題文から短い id を作る（FNV-1a） */
export function lessonQuizId(question: string): string {
  let h = 0x811c9dc5;
  for (const ch of question) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `q${h.toString(36)}`;
}

/** レッスンの本文から、確認問題とその id を取り出す */
export function lessonQuizzes(body: string): { id: string; quiz: Quiz }[] {
  const out: { id: string; quiz: Quiz }[] = [];
  for (const m of body.matchAll(/^```quiz\n([\s\S]*?)^```$/gm)) {
    const quiz = parseQuiz(m[1]);
    if (quiz) out.push({ id: lessonQuizId(quiz.question), quiz });
  }
  return out;
}
