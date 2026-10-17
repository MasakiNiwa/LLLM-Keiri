import { useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ELEMENT_LABELS, increaseSide, type Account } from '@/lib/content/schema';
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

/** 勘定科目の説明（どの画面からでも開ける。App に 1 つだけ置く） */
export function AccountSheet() {
  const name = useAccountSheet((s) => s.name);
  const close = useAccountSheet((s) => s.close);
  const book = useContent((s) => s.book);
  const account = name ? book?.find(name) : undefined;
  return (
    <BottomSheet
      open={!!account}
      onClose={close}
      title={account?.name ?? ''}
      description={account?.kana}
      expandable
    >
      {account && <AccountDetail key={account.name} account={account} />}
    </BottomSheet>
  );
}
