import { useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Link } from 'wouter';
import { findTerm } from '@/lib/content/glossary';
import {
  ELEMENT_LABELS,
  increaseSide,
  type Account,
  type GlossaryTerm,
} from '@/lib/content/schema';
import { parseShiwake } from '@/lib/journal/parse';
import { SIDE_LABELS } from '@/lib/journal/types';
import { cn } from '@/lib/utils/cn';
import { useContent } from '@/features/content/contentStore';
import { JournalTable } from '@/features/journal/JournalTable';
import { useAccountSheet } from './accountSheetStore';
import { ELEMENT_STYLES } from './elementStyles';

export function ElementBadge({ account, className }: { account: Account; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-xs font-medium',
        ELEMENT_STYLES[account.element],
        className,
      )}
    >
      {ELEMENT_LABELS[account.element]}
      {account.contra && '（評価）'}
    </span>
  );
}

function AccountDetail({ account }: { account: Account }) {
  const open = useAccountSheet((s) => s.open);
  const side = increaseSide(account);
  const examples = useMemo(
    () => account.examples.flatMap((ex) => parseShiwake(ex).entries),
    [account.examples],
  );
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <ElementBadge account={account} />
        <span className="text-slate-500 dark:text-slate-400">{account.group}</span>
        {side && (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
            <ArrowUpRight className="size-3.5" />
            増えたら{SIDE_LABELS[side]}
            <ArrowDownLeft className="ml-1 size-3.5" />
            減ったら{SIDE_LABELS[side === 'dr' ? 'cr' : 'dr']}
          </span>
        )}
      </div>
      <p className="leading-relaxed">{account.description}</p>
      {account.usage && (
        <p className="rounded-xl bg-slate-50 p-3 leading-relaxed dark:bg-slate-800/50">
          {account.usage}
        </p>
      )}
      {account.aliases.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          別の書き方: {account.aliases.join('、')}
        </p>
      )}
      {examples.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">仕訳の例</h3>
          {examples.map((e, i) => (
            <JournalTable key={i} entry={e} />
          ))}
        </div>
      )}
      {account.related.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">関連する科目</h3>
          <div className="flex flex-wrap gap-2">
            {account.related.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => open(r)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TermDetail({ term }: { term: GlossaryTerm }) {
  const open = useAccountSheet((s) => s.open);
  const close = useAccountSheet((s) => s.close);
  const lessons = useContent((s) => s.index?.lessons);
  return (
    <div className="space-y-4 text-sm">
      <span className="inline-flex rounded-md bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-200">
        用語
      </span>
      <p className="leading-relaxed">{term.description}</p>
      {term.aliases.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          別の言い方: {term.aliases.join('、')}
        </p>
      )}
      {term.lessons.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">詳しく学ぶ</h3>
          <ul className="space-y-1">
            {term.lessons.map((id) => (
              <li key={id}>
                <Link
                  href={`/learn/${id}`}
                  onClick={close}
                  className="text-accent-700 hover:underline dark:text-accent-300"
                >
                  {lessons?.find((l) => l.id === id)?.title ?? id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {term.related.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">関連する用語・科目</h3>
          <div className="flex flex-wrap gap-2">
            {term.related.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => open(r)}
                className="rounded-lg border border-slate-300 px-2.5 py-1 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** 勘定科目・用語の説明（どの画面からでも開ける。App に 1 つだけ置く） */
export function AccountSheet() {
  const name = useAccountSheet((s) => s.name);
  const close = useAccountSheet((s) => s.close);
  const book = useContent((s) => s.book);
  const glossary = useContent((s) => s.index?.glossary);
  const account = name ? book?.find(name) : undefined;
  const term = name && !account ? findTerm(glossary, name) : undefined;
  return (
    <BottomSheet
      open={!!account || !!term}
      onClose={close}
      title={account?.name ?? term?.term ?? ''}
      description={account?.kana ?? term?.kana}
      expandable
    >
      {account && <AccountDetail key={account.name} account={account} />}
      {term && <TermDetail key={term.term} term={term} />}
    </BottomSheet>
  );
}
