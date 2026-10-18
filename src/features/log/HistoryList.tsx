import { useMemo, useState } from 'react';
import { BookOpenText, ChevronRight, PenLine } from 'lucide-react';
import { Link } from 'wouter';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { cn } from '@/lib/utils/cn';
import { fmtDate, historyHref, useHistory, useTargetTitle } from './useHistory';

type Filter = 'all' | 'lesson' | 'questions';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'lesson', label: 'レッスン' },
  { value: 'questions', label: '問題・演習' },
];

/** 学習対象ごとの履歴の一覧（学習した回数・最後の日・結果・次の復習） */
export function HistoryList() {
  const history = useHistory();
  const titleOf = useTargetTitle();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());
  const rows = useMemo(
    () =>
      [...(history?.values() ?? [])]
        .filter((h) => filter === 'all' || h.kind === filter)
        .map((h) => ({ h, ...titleOf(h.id) }))
        .filter((r) => !query.trim() || r.title.includes(query.trim()))
        .sort((a, b) => b.h.lastAt - a.h.lastAt),
    [history, filter, query, titleOf],
  );
  if (!history) return <p className="text-sm text-slate-500">読み込み中…</p>;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              filter === f.value
                ? 'border-accent-600 bg-accent-600 text-white'
                : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <SearchInput value={query} onChange={setQuery} placeholder="名前で探す" />
      {rows.length === 0 && (
        <p className="text-sm text-slate-500">
          まだ記録がありません。レッスンを読んだり、問題を解いたりすると、ここに対象ごとの履歴が出ます。
        </p>
      )}
      <div className="space-y-2">
        {rows.map(({ h, title }) => {
          const due = h.nextDue !== undefined && h.nextDue <= now + 86_400_000;
          return (
            <Link key={h.id} href={historyHref(h.id)} className="group block">
              <Card className="flex items-center gap-3 p-3 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 [&_svg]:size-4">
                  {h.kind === 'lesson' ? <BookOpenText /> : <PenLine />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{title}</span>
                  <span className="flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>学習 {h.days} 回</span>
                    <span>最後 {fmtDate(h.lastAt)}</span>
                    {h.triedQuestions > 0 && (
                      <span>
                        正解 {h.correctNow}/{h.triedQuestions}
                      </span>
                    )}
                    {h.nextDue !== undefined && (
                      <span className={cn(due && 'font-medium text-amber-700 dark:text-amber-300')}>
                        次の復習 {fmtDate(h.nextDue)}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-slate-400" />
              </Card>
            </Link>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        学習の回数は、その対象を学んだ日の数です（レッスンは開いた・読んだ・復習した日と、確認問題を解いた日）。正解は、問題ごとの最後の答え合わせで、答えを見ずに正解した数です。
      </p>
    </div>
  );
}
