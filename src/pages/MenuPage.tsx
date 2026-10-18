import { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { Link } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { NAV_GROUPS, type NavItem } from '@/app/navItems';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { useFocus } from '@/features/ai/useFocus';
import { useCommand } from '@/features/command/commandStore';
import { matchFeatures } from '@/features/command/matchFeatures';

function FeatureCard({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.to} className="group">
      <Card className="flex h-full items-center gap-3 p-3.5 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{item.label}</span>
          <span className="block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {item.description}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-slate-400" />
      </Card>
    </Link>
  );
}

/** すべての機能（スマホの下部ナビの「メニュー」） */
export default function MenuPage() {
  const [query, setQuery] = useState('');
  useFocus({ kind: 'other', page: 'メニュー（すべての機能）' });
  return (
    <>
      <PageHeader title="メニュー" />
      <PageBody>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="機能を探す（例: 試算表、期限、復習）"
        />
        {query.trim() ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {NAV_GROUPS.flatMap((g) => matchFeatures(g.items, query)).map((i) => (
              <FeatureCard key={i.to} item={i} />
            ))}
          </div>
        ) : (
          NAV_GROUPS.map((g) => (
            <section key={g.id} className="space-y-2">
              <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {g.label}
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.items.map((i) => (
                  <FeatureCard key={i.to} item={i} />
                ))}
              </div>
            </section>
          ))
        )}
        <button
          type="button"
          onClick={() => useCommand.getState().setOpen(true)}
          className="flex w-full items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-left text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Search className="size-4" />
          レッスン・問題・勘定科目・用語もまとめて探す
        </button>
      </PageBody>
    </>
  );
}
