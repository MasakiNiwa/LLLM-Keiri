import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/db';
import { buildHistory, type TargetHistory } from '@/lib/log/history';
import { useTitles } from './useTitles';

/** 学習対象ごとの履歴（この端末の記録から集計） */
export function useHistory(): Map<string, TargetHistory> | undefined {
  return useLiveQuery(async () => {
    const [activity, lessonProgress, attempts, reviews] = await Promise.all([
      db.activity.toArray(),
      db.lessonProgress.toArray(),
      db.drillAttempts.toArray(),
      db.reviews.toArray(),
    ]);
    return buildHistory({ activity, lessonProgress, attempts, reviews });
  }, []);
}

/** 履歴の対象の表示名とリンク（レッスンは確認問題も含めたレッスンそのもの） */
export function useTargetTitle(): (id: string) => { title: string; href?: string } {
  const titles = useTitles();
  return (id) => {
    const t = id.startsWith('lesson:') ? titles.get(id.slice(7)) : titles.get(id);
    return t ?? { title: id };
  };
}

export const historyHref = (id: string) => `/history/${encodeURIComponent(id)}`;

export const fmtDate = (at: number) =>
  new Date(at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric' });

const BACK_KEY = 'lllm-keiri:history-back';

/** 履歴の画面の戻り先を覚える（学習対象のページから開いたときはそのページへ戻る） */
export function rememberHistoryBack(to: string | null): void {
  try {
    if (to) sessionStorage.setItem(BACK_KEY, to);
    else sessionStorage.removeItem(BACK_KEY);
  } catch {
    // 保存できなくても、履歴の一覧へ戻るだけ
  }
}

export function historyBack(): { to: string; label: string } {
  try {
    const to = sessionStorage.getItem(BACK_KEY);
    if (to) return { to, label: '学習のページへ' };
  } catch {
    // 読めなければ履歴の一覧へ
  }
  return { to: '/log/history', label: '履歴へ' };
}
