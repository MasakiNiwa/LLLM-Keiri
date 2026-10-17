/**
 * AI に渡すアプリの状態（構造化データ）。
 * 見ているもの（focus）と、学習の進み具合の要約を JSON にする。
 * 数字はプログラムが数えたものだけを渡し、AI には計算させない。
 */
import { fetchContentIndex } from '@/lib/content/load';
import { db } from '@/lib/db/db';
import { summarize } from '@/features/drill/records';
import type { AiFocus } from './focusStore';

export interface AppState {
  now: string;
  /** いま見ているもの */
  viewing: AiFocus;
  progress?: {
    lessonsRead: number;
    lessonsTotal: number;
    /** 解いた問題セットの成績（正解数 / 問題数） */
    drills: { title: string; correct: number; total: number }[];
  };
}

export async function buildAppState(viewing: AiFocus): Promise<AppState> {
  const state: AppState = {
    now: new Date().toLocaleString('ja-JP', { dateStyle: 'medium', timeStyle: 'short' }),
    viewing,
  };
  try {
    const [index, progress, attempts] = await Promise.all([
      fetchContentIndex(),
      db.lessonProgress.toArray(),
      db.drillAttempts.toArray(),
    ]);
    const stats = summarize(attempts);
    state.progress = {
      lessonsRead: progress.filter((p) => p.readAt).length,
      lessonsTotal: index.lessons.length,
      drills: index.drills
        .filter((d) => stats.has(d.id))
        .map((d) => ({
          title: d.title,
          correct: stats.get(d.id)!.correct,
          total: d.questionCount,
        })),
    };
  } catch (e) {
    console.warn('学習の進み具合を取得できませんでした', e);
  }
  return state;
}

export function formatAppState(state: AppState): string {
  return `<app_state>\n${JSON.stringify(state)}\n</app_state>`;
}
