/**
 * 復習の予定（setId・questionId）から、出し直す問題を読み込む。
 * setId の形: <問題セットの id>（仕訳問題・マイ教材）／ exercise:<id> ／ quiz:<id> ／ lesson:<id>（確認問題）
 * ／ read（レッスンそのものの復習。questionId がレッスンの id）
 */
import { loadDrill, loadLesson } from '@/features/studio/userContentRepo';
import { fetchExercise, fetchQuizSet } from '@/lib/content/load';
import { lessonQuizzes } from '@/lib/content/lessonQuiz';
import type { DrillQuestion, RcmCase } from '@/lib/content/schema';

export type ReviewItem = { setId: string; questionId: string; title: string; href: string } & (
  | { kind: 'shiwake'; question: DrillQuestion }
  | {
      kind: 'choice';
      context?: string;
      question: string;
      choices: string[];
      answer: number;
      explanation?: string;
    }
  | { kind: 'rcm'; rcm: RcmCase; risk: RcmCase['risks'][number]; index: number }
  | { kind: 'lesson'; lessonId: string; summary: string; headings: string[] }
);

type Loaded = (questionId: string) => ReviewItem | null;

/** setId ごとに 1 度だけ読み込む */
export async function loader(setId: string): Promise<Loaded> {
  const base = { setId };
  if (setId.startsWith('exercise:')) {
    const id = setId.slice(9);
    const ex = await fetchExercise(id);
    return (qid) => {
      const q = ex.adjustments.find((a) => a.id === qid);
      return q
        ? {
            ...base,
            questionId: qid,
            title: ex.title,
            href: `/exercise/${id}`,
            kind: 'shiwake',
            question: q,
          }
        : null;
    };
  }
  if (setId.startsWith('quiz:')) {
    const id = setId.slice(5);
    const set = await fetchQuizSet(id);
    const href = `/quiz/${id}`;
    return (qid) => {
      const q = set.questions.find((x) => x.id === qid);
      if (q) return { ...base, questionId: qid, title: set.title, href, kind: 'choice', ...q };
      const ri = set.rcm?.risks.findIndex((x) => x.id === qid) ?? -1;
      if (set.rcm && ri >= 0)
        return {
          ...base,
          questionId: qid,
          title: set.title,
          href,
          kind: 'rcm',
          rcm: set.rcm,
          risk: set.rcm.risks[ri],
          index: ri,
        };
      const m = set.match?.items.find((x) => x.id === qid);
      if (set.match && m)
        return {
          ...base,
          questionId: qid,
          title: set.title,
          href,
          kind: 'choice',
          context: `${set.match.title}（${set.match.optionsLabel}を選ぶ）`,
          question: m.prompt,
          choices: set.match.options.map((o) => o.text),
          answer: set.match.options.findIndex((o) => o.id === m.answer),
          explanation: m.explanation,
        };
      return null;
    };
  }
  if (setId.startsWith('lesson:')) {
    const id = setId.slice(7);
    const lesson = await loadLesson(id);
    const quizzes = lessonQuizzes(lesson.body);
    const title = `${lesson.meta.title}（確認問題）`;
    return (qid) => {
      const q = quizzes.find((x) => x.id === qid)?.quiz;
      if (!q) return null;
      const common = { ...base, questionId: qid, title, href: `/learn/${id}` };
      return q.type === 'choice'
        ? { ...common, kind: 'choice', ...q }
        : { ...common, kind: 'shiwake', question: { ...q, id: qid } };
    };
  }
  const set = await loadDrill(setId);
  return (qid) => {
    const q = set.questions.find((x) => x.id === qid);
    return q
      ? {
          ...base,
          questionId: qid,
          title: set.title,
          href: `/drill/${setId}`,
          kind: 'shiwake',
          question: q,
        }
      : null;
  };
}

/** 復習の予定の順に、問題を読み込む（読めないもの・消えた問題は飛ばす） */
export async function loadReviewItems(
  records: { setId: string; questionId: string }[],
): Promise<ReviewItem[]> {
  const loaders = new Map<string, Loaded | null>();
  const items: ReviewItem[] = [];
  for (const r of records) {
    if (r.setId === 'read') {
      const lesson = await loadLesson(r.questionId).catch(() => null);
      if (lesson)
        items.push({
          setId: r.setId,
          questionId: r.questionId,
          title: lesson.meta.title,
          href: `/learn/${r.questionId}`,
          kind: 'lesson',
          lessonId: r.questionId,
          summary: lesson.meta.summary,
          headings: lesson.meta.headings.filter((h) => h.depth === 2).map((h) => h.text),
        });
      continue;
    }
    if (!loaders.has(r.setId)) loaders.set(r.setId, await loader(r.setId).catch(() => null));
    const item = loaders.get(r.setId)?.(r.questionId);
    if (item) items.push(item);
  }
  return items;
}
