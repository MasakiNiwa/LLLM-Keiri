import { useMemo, useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { useContent, useContentIndex } from '@/features/content/contentStore';
import { normalizeName } from '@/lib/content/accounts';
import { ELEMENTS, ELEMENT_LABELS } from '@/lib/content/schema';
import { cn } from '@/lib/utils/cn';
import { ELEMENT_STYLES } from '@/features/accounts/elementStyles';

interface AccountPickerProps {
  open: boolean;
  /** 選べる科目（問題の選択肢）。無ければすべての科目から選ぶ */
  candidates?: string[];
  /** 今選んでいる科目 */
  current?: string;
  onPick: (name: string) => void;
  onClose: () => void;
}

const chip =
  'rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-accent-400 hover:bg-accent-50 dark:hover:bg-slate-800';

/** 勘定科目を選ぶシート（スマホは下から、PC は中央に出る） */
export function AccountPicker({ open, candidates, current, onPick, onClose }: AccountPickerProps) {
  const book = useContent((s) => s.book);
  // 直接このページを開いたときも、勘定科目の一覧を読み込む
  useContentIndex();
  const [all, setAll] = useState(false);
  const [query, setQuery] = useState('');
  const showAll = all || !candidates;

  const groups = useMemo(() => {
    const q = normalizeName(query).toLowerCase();
    const list = (book?.accounts ?? []).filter(
      (a) =>
        !q ||
        [a.name, a.kana, ...a.aliases].some((s) => normalizeName(s).toLowerCase().includes(q)),
    );
    return ELEMENTS.map((el) => ({ el, items: list.filter((a) => a.element === el) })).filter(
      (g) => g.items.length > 0,
    );
  }, [book, query]);

  const pick = (name: string) => {
    onPick(name);
    setAll(false);
    setQuery('');
    onClose();
  };
  const close = () => {
    setAll(false);
    setQuery('');
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={close} title="勘定科目を選ぶ" expandable>
      {!showAll && candidates && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {candidates.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => pick(name)}
                className={cn(
                  chip,
                  current === name
                    ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30'
                    : 'border-slate-300 dark:border-slate-700',
                )}
              >
                {name}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => setAll(true)}>
            ほかの勘定科目から選ぶ
          </Button>
        </div>
      )}
      {showAll && (
        <div className="space-y-3">
          <SearchInput value={query} onChange={setQuery} placeholder="科目名・よみで絞り込み" />
          {groups.map(({ el, items }) => (
            <section key={el}>
              <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className={cn('rounded px-1.5 py-0.5', ELEMENT_STYLES[el])}>
                  {ELEMENT_LABELS[el]}
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {items.map((a) => (
                  <button
                    key={a.name}
                    type="button"
                    onClick={() => pick(a.name)}
                    className={cn(
                      chip,
                      current === a.name
                        ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30'
                        : 'border-slate-300 dark:border-slate-700',
                    )}
                  >
                    {a.name}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {groups.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">見つかりませんでした</p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
