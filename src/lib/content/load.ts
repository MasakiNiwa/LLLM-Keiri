import type {
  ClosingExercise,
  ConsolidationCase,
  ContentIndex,
  DrillSet,
  Lesson,
  QuizSet,
  SearchDoc,
} from './schema';

/**
 * 学習データ（ビルド時に content/ から作った JSON）を読み込む。
 * 相対パスなので、GitHub Pages のサブパスでもそのまま動く。
 */
async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`./content/${path}`);
  if (!res.ok) throw new Error(`${path} を読み込めません（HTTP ${res.status}）`);
  return (await res.json()) as T;
}

let indexPromise: Promise<ContentIndex> | null = null;

export function fetchContentIndex(): Promise<ContentIndex> {
  indexPromise ??= fetchJson<ContentIndex>('index.json').catch((e) => {
    indexPromise = null;
    throw e;
  });
  return indexPromise;
}

const lessonCache = new Map<string, Promise<Lesson>>();

export function fetchLesson(id: string): Promise<Lesson> {
  let p = lessonCache.get(id);
  if (!p) {
    p = fetchJson<Lesson>(`lessons/${encodeURIComponent(id)}.json`).catch((e) => {
      lessonCache.delete(id);
      throw e;
    });
    lessonCache.set(id, p);
  }
  return p;
}

export function fetchDrill(id: string): Promise<DrillSet> {
  return fetchJson<DrillSet>(`drills/${encodeURIComponent(id)}.json`);
}

export function fetchSearchDocs(): Promise<SearchDoc[]> {
  return fetchJson<SearchDoc[]>('search.json');
}

export function fetchConsolidation(id: string): Promise<ConsolidationCase> {
  return fetchJson<ConsolidationCase>(`consolidation/${encodeURIComponent(id)}.json`);
}

export function fetchExercise(id: string): Promise<ClosingExercise> {
  return fetchJson<ClosingExercise>(`exercises/${encodeURIComponent(id)}.json`);
}

export function fetchQuizSet(id: string): Promise<QuizSet> {
  return fetchJson<QuizSet>(`quizzes/${encodeURIComponent(id)}.json`);
}
