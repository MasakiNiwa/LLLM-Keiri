import { cn } from '@/lib/utils/cn';
import { pairRows, totals } from '@/lib/journal/balance';
import { formatAmount } from '@/lib/journal/amount';
import type { JournalEntry, JournalLine } from '@/lib/journal/types';
import { useAccountSheet } from '@/features/accounts/accountSheetStore';
import { useContent } from '@/features/content/contentStore';

interface JournalTableProps {
  entry: JournalEntry;
  /** 科目名を押すと説明を開く（既定: true） */
  linkAccounts?: boolean;
  /** 行ごとの強調（採点結果の表示など）。キーは「dr:科目名」「cr:科目名」 */
  marks?: Record<string, 'ok' | 'ng'>;
  className?: string;
  compact?: boolean;
  /** 科目名を押したとき（指定すると、説明の代わりにこれを呼ぶ。ドリルダウン用） */
  onAccountClick?: (name: string) => void;
}

function AccountName({
  name,
  link,
  onClick,
}: {
  name: string;
  link: boolean;
  onClick?: (name: string) => void;
}) {
  const book = useContent((s) => s.book);
  const known = link && (!!onClick || !!book?.find(name));
  if (!known) return <span>{name}</span>;
  return (
    <button
      type="button"
      onClick={() => (onClick ? onClick(name) : useAccountSheet.getState().open(name))}
      className="text-left underline decoration-slate-300 decoration-dotted underline-offset-4 hover:text-accent-700 hover:decoration-accent-500 dark:decoration-slate-600 dark:hover:text-accent-300"
    >
      {name}
    </button>
  );
}

function Cell({
  line,
  link,
  mark,
  onAccountClick,
}: {
  line?: JournalLine;
  link: boolean;
  mark?: 'ok' | 'ng';
  onAccountClick?: (name: string) => void;
}) {
  const tone =
    mark === 'ng'
      ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
      : mark === 'ok'
        ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
        : '';
  return (
    <>
      <div className={cn('min-w-0 px-2.5 py-1.5 break-words', tone)}>
        {line && <AccountName name={line.account} link={link} onClick={onAccountClick} />}
      </div>
      <div className={cn('px-2.5 py-1.5 text-right font-mono tabular-nums', tone)}>
        {line && formatAmount(line.amount)}
      </div>
    </>
  );
}

/**
 * 仕訳を「借方 | 貸方」の表で表示する。
 * 借方・貸方は色だけでなく見出しの文字でも区別する。
 */
export function JournalTable({
  entry,
  linkAccounts = true,
  marks,
  className,
  compact,
  onAccountClick,
}: JournalTableProps) {
  const rows = pairRows(entry.lines);
  const t = totals(entry.lines);
  const multi = rows.length > 1;
  const balanced = t.dr === t.cr;
  return (
    <figure
      className={cn(
        'overflow-hidden rounded-xl border border-slate-200 bg-white text-[0.92em] dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
    >
      {entry.caption && (
        <figcaption className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[0.9em] text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
          {entry.caption}
        </figcaption>
      )}
      <div
        className={cn(
          'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]',
          compact ? 'text-[0.95em]' : '',
        )}
      >
        <div className="col-span-2 border-r border-b border-slate-200 bg-sky-50/70 px-2.5 py-1 text-xs font-semibold text-sky-800 dark:border-slate-700 dark:bg-sky-950/30 dark:text-sky-200">
          借方
        </div>
        <div className="col-span-2 border-b border-slate-200 bg-amber-50/70 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-slate-700 dark:bg-amber-950/30 dark:text-amber-200">
          貸方
        </div>
        {rows.map(([dr, cr], i) => (
          <div key={i} className="contents">
            <div className="col-span-2 grid grid-cols-subgrid border-r border-slate-200 dark:border-slate-700">
              <Cell
                line={dr}
                link={linkAccounts}
                mark={dr && marks?.[`dr:${dr.account}`]}
                onAccountClick={onAccountClick}
              />
            </div>
            <div className="col-span-2 grid grid-cols-subgrid">
              <Cell
                line={cr}
                link={linkAccounts}
                mark={cr && marks?.[`cr:${cr.account}`]}
                onAccountClick={onAccountClick}
              />
            </div>
          </div>
        ))}
        {multi && (
          <div className="col-span-4 grid grid-cols-subgrid border-t border-slate-200 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <div className="px-2.5 py-1">合計</div>
            <div
              className={cn(
                'border-r border-slate-200 px-2.5 py-1 text-right font-mono tabular-nums dark:border-slate-700',
                !balanced && 'text-rose-600 dark:text-rose-400',
              )}
            >
              {formatAmount(t.dr)}
            </div>
            <div className="px-2.5 py-1" />
            <div
              className={cn(
                'px-2.5 py-1 text-right font-mono tabular-nums',
                !balanced && 'text-rose-600 dark:text-rose-400',
              )}
            >
              {formatAmount(t.cr)}
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}
