import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { SearchInput } from '@/components/ui/SearchInput';
import { ElementBadge } from '@/features/accounts/AccountSheet';
import { useAccountSheet } from '@/features/accounts/accountSheetStore';
import { useContentIndex } from '@/features/content/contentStore';
import { normalizeName } from '@/lib/content/accounts';
import { ELEMENTS, ELEMENT_LABELS, type Account, type Element } from '@/lib/content/schema';

function matches(a: Account, q: string): boolean {
  const n = normalizeName(q).toLowerCase();
  return [a.name, a.kana, ...a.aliases, a.group].some((s) =>
    normalizeName(s).toLowerCase().includes(n),
  );
}

export default function AccountsPage() {
  const { index, error } = useContentIndex();
  const [query, setQuery] = useState('');
  const [element, setElement] = useState<Element | null>(null);
  const open = useAccountSheet((s) => s.open);

  const groups = useMemo(() => {
    const list = (index?.accounts ?? []).filter(
      (a) => (!element || a.element === element) && (!query.trim() || matches(a, query)),
    );
    return ELEMENTS.map((el) => ({ el, items: list.filter((a) => a.element === el) })).filter(
      (g) => g.items.length > 0,
    );
  }, [index, query, element]);

  return (
    <>
      <PageHeader title="勘定科目" />
      <PageBody>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="科目名・よみ・区分で絞り込み（例: うりかけ、流動負債）"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="区分で絞り込む">
          <Chip active={element === null} onClick={() => setElement(null)}>
            すべて
          </Chip>
          {ELEMENTS.map((el) => (
            <Chip
              key={el}
              active={element === el}
              onClick={() => setElement(element === el ? null : el)}
            >
              {ELEMENT_LABELS[el]}
            </Chip>
          ))}
        </div>
        {error && <p className="text-sm text-rose-600">読み込めませんでした: {error}</p>}
        {index && groups.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">見つかりませんでした</p>
        )}
        {groups.map(({ el, items }) => (
          <section key={el} className="space-y-2">
            <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {ELEMENT_LABELS[el]}（{items.length}）
            </h2>
            <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
              {items.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => open(a.name)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-xs text-slate-400">{a.kana}</span>
                    </span>
                    <span className="line-clamp-1 block text-sm text-slate-500 dark:text-slate-400">
                      {a.description}
                    </span>
                  </span>
                  <span className="hidden text-xs text-slate-500 sm:block">{a.group}</span>
                  <ElementBadge account={a} />
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </Card>
          </section>
        ))}
      </PageBody>
    </>
  );
}
