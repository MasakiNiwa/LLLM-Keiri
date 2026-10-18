import { useState } from 'react';
import {
  BookOpenText,
  CheckCircle2,
  ChevronRight,
  Circle,
  FolderHeart,
  PenLine,
  Tags,
} from 'lucide-react';
import { Link } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { useAccountSheet } from '@/features/accounts/accountSheetStore';
import { useFocus } from '@/features/ai/useFocus';
import {
  filterUserContent,
  useUserContent,
  userContentHref,
  userContentSnippet,
} from '@/features/studio/userContentRepo';
import { useContentIndex } from '@/features/content/contentStore';
import { LevelBadge } from '@/features/learn/MetaBadges';
import { useLessonProgress } from '@/features/learn/progress';
import { TrackIcon } from '@/features/learn/trackIcons';
import { useSearch } from '@/features/learn/useSearch';
import type { ContentIndex } from '@/lib/content/schema';
import type { SearchHit } from '@/lib/search/client';
import { warmupSearch } from '@/lib/search/client';

const KIND_LABELS: Record<SearchHit['kind'], string> = {
  lesson: 'レッスン',
  drill: '練習問題',
  account: '勘定科目',
};

function HitIcon({ kind }: { kind: SearchHit['kind'] }) {
  const Icon = kind === 'lesson' ? BookOpenText : kind === 'drill' ? PenLine : Tags;
  return <Icon className="mt-0.5 size-4 shrink-0 text-accent-600 dark:text-accent-400" />;
}

function MineResults({ query }: { query: string }) {
  const mine = filterUserContent(useUserContent() ?? [], query);
  if (mine.length === 0) return null;
  return (
    <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
      {mine.map((c) => (
        <Link
          key={c.id}
          href={userContentHref(c)}
          className="flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
        >
          <FolderHeart className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-400" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{c.title}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">マイ教材</span>
            <span className="mt-1 line-clamp-2 block text-sm text-slate-600 dark:text-slate-400">
              {userContentSnippet(c, query)}
            </span>
          </span>
        </Link>
      ))}
    </Card>
  );
}

function SearchResults({ query, index }: { query: string; index: ContentIndex }) {
  return (
    <div className="space-y-3">
      <MineResults query={query} />
      <SiteResults query={query} index={index} />
    </div>
  );
}

function SiteResults({ query, index }: { query: string; index: ContentIndex }) {
  const { hits, error } = useSearch(query);
  const openAccount = useAccountSheet((s) => s.open);
  if (error) return <p className="text-sm text-rose-600">検索できませんでした: {error}</p>;
  if (!hits) return <p className="text-sm text-slate-500">検索中…</p>;
  if (hits.length === 0)
    return (
      <Card className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        「{query}」に一致するものは見つかりませんでした。言葉を短くしてみてください。
      </Card>
    );
  const trackTitle = (id?: string) => index.tracks.find((t) => t.id === id)?.title;
  return (
    <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
      {hits.map((h) => {
        const body = (
          <>
            <HitIcon kind={h.kind} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{h.title}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {KIND_LABELS[h.kind]}
                {h.track && ` ・ ${trackTitle(h.track) ?? ''}`}
              </span>
              <span className="mt-1 line-clamp-2 block text-sm text-slate-600 dark:text-slate-400">
                {h.snippet}
              </span>
            </span>
          </>
        );
        const className =
          'flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50';
        const [kind, id] = [h.kind, h.id.slice(h.id.indexOf(':') + 1)];
        if (kind === 'account')
          return (
            <button key={h.id} type="button" className={className} onClick={() => openAccount(id)}>
              {body}
            </button>
          );
        return (
          <Link
            key={h.id}
            href={kind === 'lesson' ? `/learn/${id}` : `/drill/${id}`}
            className={className}
          >
            {body}
          </Link>
        );
      })}
    </Card>
  );
}

function TrackList({ index }: { index: ContentIndex }) {
  const progress = useLessonProgress();
  const mine = useUserContent()?.filter((c) => c.kind === 'lesson');
  return (
    <div className="space-y-4">
      {mine && mine.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
              <FolderHeart className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">マイ教材</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                外部の AI で作って取り込んだレッスン
              </p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {mine.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/learn/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  {progress?.get(c.id)?.readAt ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-slate-300 dark:text-slate-600" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {index.tracks.map((track) => {
        const lessons = index.lessons.filter((l) => l.track === track.id);
        const read = lessons.filter((l) => progress?.get(l.id)?.readAt).length;
        return (
          <Card key={track.id} className="overflow-hidden">
            <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                <TrackIcon name={track.icon} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">{track.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{track.description}</p>
              </div>
              {lessons.length > 0 && (
                <span className="shrink-0 text-xs text-slate-500 tabular-nums">
                  {read}/{lessons.length}
                </span>
              )}
            </div>
            {lessons.length === 0 ? (
              <p className="px-4 py-3 text-sm text-slate-400">レッスンは準備中です</p>
            ) : (
              <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                {lessons.map((l) => {
                  const done = !!progress?.get(l.id)?.readAt;
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/learn/${l.id}`}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        {done ? (
                          <CheckCircle2
                            className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                            aria-label="読んだ"
                          />
                        ) : (
                          <Circle className="size-5 shrink-0 text-slate-300 dark:text-slate-600" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{l.title}</span>
                          <span className="line-clamp-1 block text-sm text-slate-500 dark:text-slate-400">
                            {l.summary}
                          </span>
                        </span>
                        <span className="hidden shrink-0 sm:block">
                          <LevelBadge level={l.level} />
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-slate-400" />
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        );
      })}
    </div>
  );
}

export default function LearnPage() {
  const { index, error } = useContentIndex();
  const [query, setQuery] = useState('');
  useFocus({ kind: 'other', page: 'レッスンの一覧' });
  return (
    <>
      <PageHeader title="学ぶ" />
      <PageBody>
        <SearchInput
          value={query}
          onChange={setQuery}
          onFocus={warmupSearch}
          placeholder="レッスン・勘定科目を検索（例: 売掛金、消費税）"
        />
        {error && (
          <p className="text-sm text-rose-600">学習データを読み込めませんでした: {error}</p>
        )}
        {index &&
          (query.trim() ? (
            <SearchResults query={query} index={index} />
          ) : (
            <TrackList index={index} />
          ))}
      </PageBody>
    </>
  );
}
