import { History } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { fmtDate, historyHref, rememberHistoryBack, useHistory } from './useHistory';

/**
 * 学習対象のページから、その対象の学習の履歴へのリンク。
 * targetId: lesson:<id> ／ quiz:<id> ／ exercise:<id> ／ 問題セットの id。記録が無ければ何も出さない
 */
export function HistoryLink({ targetId }: { targetId: string }) {
  const h = useHistory()?.get(targetId);
  const [location] = useLocation();
  if (!h) return null;
  return (
    <Link
      href={historyHref(targetId)}
      onClick={() => rememberHistoryBack(location)}
      className="inline-flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline dark:text-accent-300"
    >
      <History className="size-3.5" />
      学習の履歴（{h.days} 回・最後 {fmtDate(h.lastAt)}
      {h.triedQuestions > 0 ? `・正解 ${h.correctNow}/${h.triedQuestions}` : ''}）
    </Link>
  );
}
