import { useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { formatAmount, parseAmount } from '@/lib/journal/amount';
import { SIDE_LABELS, type Side } from '@/lib/journal/types';
import { cn } from '@/lib/utils/cn';
import { createId } from '@/lib/utils/id';
import { AccountPicker } from './AccountPicker';
import type { DraftLine } from './draft';

interface JournalInputProps {
  value: DraftLine[];
  onChange: (value: DraftLine[]) => void;
  /** 選べる科目（無ければすべて） */
  candidates?: string[];
  /** 採点後の印（キーは「dr:科目名」） */
  marks?: Record<string, 'ok' | 'ng'>;
  disabled?: boolean;
}

const SIDE_STYLES: Record<Side, string> = {
  dr: 'bg-sky-50/70 text-sky-800 dark:bg-sky-950/30 dark:text-sky-200',
  cr: 'bg-amber-50/70 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200',
};

function sideTotal(lines: DraftLine[], side: Side): number {
  return lines
    .filter((l) => l.side === side)
    .reduce((sum, l) => sum + (parseAmount(l.amount) ?? 0), 0);
}

/**
 * 仕訳の入力（借方・貸方の行を追加して、科目を選び、金額を入れる）。
 * スマホでも打ちやすいよう、科目はシートから選び、金額は数字のキーボードで入れる。
 */
export function JournalInput({ value, onChange, candidates, marks, disabled }: JournalInputProps) {
  const [picking, setPicking] = useState<string | null>(null);
  const update = (id: string, patch: Partial<DraftLine>) =>
    onChange(value.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const remove = (id: string) => onChange(value.filter((l) => l.id !== id));
  const add = (side: Side) =>
    onChange([...value, { id: createId(), side, account: '', amount: '' }]);
  const dr = sideTotal(value, 'dr');
  const cr = sideTotal(value, 'cr');
  const pickingLine = value.find((l) => l.id === picking);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {(['dr', 'cr'] as const).map((side) => {
          const rows = value.filter((l) => l.side === side);
          return (
            <div
              key={side}
              className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            >
              <div className={cn('px-2.5 py-1 text-xs font-semibold', SIDE_STYLES[side])}>
                {SIDE_LABELS[side]}
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((l) => {
                  const mark = l.account ? marks?.[`${side}:${l.account}`] : undefined;
                  return (
                    <div
                      key={l.id}
                      className={cn(
                        'space-y-1.5 p-2',
                        mark === 'ng' && 'bg-rose-50 dark:bg-rose-950/40',
                        mark === 'ok' && 'bg-emerald-50/70 dark:bg-emerald-950/30',
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => setPicking(l.id)}
                          className={cn(
                            'flex h-10 min-w-0 flex-1 items-center gap-1 rounded-lg border px-2 text-left text-sm disabled:opacity-70',
                            l.account
                              ? 'border-slate-300 font-medium dark:border-slate-600'
                              : 'border-dashed border-slate-300 text-slate-400 dark:border-slate-600',
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">
                            {l.account || '科目を選ぶ'}
                          </span>
                          <ChevronDown className="size-4 shrink-0 text-slate-400" />
                        </button>
                        {rows.length > 1 && !disabled && (
                          <button
                            type="button"
                            onClick={() => remove(l.id)}
                            aria-label="この行を消す"
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={disabled}
                        value={l.amount}
                        placeholder="金額"
                        aria-label={`${SIDE_LABELS[side]}の金額`}
                        onChange={(e) => update(l.id, { amount: e.target.value })}
                        onBlur={() => {
                          const n = parseAmount(l.amount);
                          if (n !== null) update(l.id, { amount: formatAmount(n) });
                        }}
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-right font-mono text-[16px] tabular-nums disabled:opacity-70 sm:text-sm dark:border-slate-600 dark:bg-slate-900"
                      />
                    </div>
                  );
                })}
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => add(side)}
                  className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-1.5 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <Plus className="size-3.5" />
                  行を追加
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
        {[dr, cr].map((t, i) => (
          <div key={i} className="flex justify-between">
            <span>合計</span>
            <span
              className={cn(
                'font-mono tabular-nums',
                dr !== cr && dr > 0 && cr > 0 && 'text-rose-600 dark:text-rose-400',
              )}
            >
              {formatAmount(t)}
            </span>
          </div>
        ))}
      </div>
      <AccountPicker
        open={!!pickingLine}
        candidates={candidates}
        current={pickingLine?.account}
        onPick={(name) => pickingLine && update(pickingLine.id, { account: name })}
        onClose={() => setPicking(null)}
      />
    </div>
  );
}
