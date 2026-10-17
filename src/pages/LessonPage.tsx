import { useEffect, useState } from 'react';
import { useFocus } from '@/features/ai/useFocus';
import { getPersona, reactionText } from '@/features/ai/personas';
import { useSettings } from '@/features/settings/settingsStore';
import { toast } from 'sonner';
import { excerptForAi, sectionText } from '@/lib/content/sections';
import { CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Clock, ListTree } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { BackButton } from '@/app/BackButton';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useContentIndex } from '@/features/content/contentStore';
import { LessonMarkdown } from '@/features/learn/LessonMarkdown';
import { BasisInfo, LevelBadge } from '@/features/learn/MetaBadges';
import { markLessonOpened, setLessonRead, useLessonProgress } from '@/features/learn/progress';
import { useFontZoom } from '@/features/settings/useFontZoom';
import { fetchLesson } from '@/lib/content/load';
import type { Lesson, LessonMeta } from '@/lib/content/schema';
import { cn } from '@/lib/utils/cn';
import { errorMessage } from '@/lib/utils/format';

function Toc({ meta }: { meta: LessonMeta }) {
  const [open, setOpen] = useState(false);
  if (meta.headings.length < 2) return null;
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/40"
      >
        <ListTree className="size-4 text-accent-600 dark:text-accent-400" />
        目次
        <ChevronRight className={cn('ml-auto size-4 transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        <ol className="border-t border-slate-100 px-2 py-2 text-sm dark:border-slate-800">
          {meta.headings.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                // ハッシュルーティングなので、#sec-1 のリンクではなくスクロールで移動する
                onClick={() =>
                  document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' })
                }
                className={cn(
                  'w-full rounded-lg px-2 py-1.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800',
                  h.depth === 3 && 'pl-6 text-slate-600 dark:text-slate-400',
                )}
              >
                {h.text}
              </button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function NeighborLink({ meta, dir }: { meta?: LessonMeta; dir: 'prev' | 'next' }) {
  if (!meta) return <div />;
  return (
    <Link
      href={`/learn/${meta.id}`}
      className={cn(
        'flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 hover:border-accent-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-accent-700',
        dir === 'next' && 'justify-end text-right',
      )}
    >
      {dir === 'prev' && <ChevronLeft className="size-5 shrink-0 text-slate-400" />}
      <span className="min-w-0">
        <span className="block text-xs text-slate-500">{dir === 'prev' ? '前へ' : '次へ'}</span>
        <span className="line-clamp-2 block text-sm font-medium">{meta.title}</span>
      </span>
      {dir === 'next' && <ChevronRight className="size-5 shrink-0 text-slate-400" />}
    </Link>
  );
}

/** 画面の上のほうに見えている見出し（読んでいる部分） */
function useCurrentSection(meta: LessonMeta | undefined): string | null {
  const [current, setCurrent] = useState<string | null>(null);
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-scroll-root]');
    if (!meta || !root) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const limit = root.getBoundingClientRect().top + root.clientHeight * 0.35;
      let found: string | null = null;
      for (const h of meta.headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top <= limit) found = h.text;
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(update);
    return () => {
      root.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [meta]);
  return current;
}

export default function LessonPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { index } = useContentIndex();
  const [loaded, setLoaded] = useState<{ id: string; lesson?: Lesson; error?: string }>({
    id: '',
  });
  const progress = useLessonProgress();
  const zoom = useFontZoom();

  useEffect(() => {
    let stale = false;
    fetchLesson(id).then(
      (lesson) => {
        if (stale) return;
        setLoaded({ id, lesson });
        void markLessonOpened(id);
      },
      (e) => !stale && setLoaded({ id, error: errorMessage(e) }),
    );
    document.querySelector('[data-scroll-root]')?.scrollTo(0, 0);
    return () => {
      stale = true;
    };
  }, [id]);

  // 前のレッスンの内容は表示しない
  const lesson = loaded.id === id ? loaded.lesson : undefined;
  const error = loaded.id === id ? loaded.error : undefined;
  const meta = lesson?.meta;
  const track = index?.tracks.find((t) => t.id === meta?.track);
  const siblings = index?.lessons.filter((l) => l.track === meta?.track) ?? [];
  const pos = siblings.findIndex((l) => l.id === id);
  const read = !!progress?.get(id)?.readAt;
  const section = useCurrentSection(meta);

  // いま読んでいる部分を AI に伝える（フロートの解説・チャットで使う）
  useFocus(
    meta && lesson
      ? {
          kind: 'lesson',
          lessonId: meta.id,
          title: meta.title,
          track: track?.title ?? meta.track,
          summary: meta.summary,
          asOf: meta.asOf,
          basis: meta.basis.map((b) => b.name),
          headings: meta.headings.map((h) => h.text),
          section: section ?? undefined,
          excerpt: excerptForAi((section && sectionText(lesson.body, section)) || lesson.body),
        }
      : null,
  );

  return (
    <>
      <PageHeader
        title={meta?.title ?? 'レッスン'}
        back={<BackButton to="/learn" label="レッスン一覧へ" />}
      />
      <PageBody key={id}>
        {error && (
          <Card className="p-6 text-center text-sm">
            レッスンを読み込めませんでした: {error}
            <div className="mt-3">
              <Link href="/learn" className="text-accent-700 underline dark:text-accent-300">
                レッスン一覧へ
              </Link>
            </div>
          </Card>
        )}
        {!lesson && !error && <p className="text-sm text-slate-500">読み込み中…</p>}
        {meta && lesson && (
          <>
            <header className="space-y-2">
              {track && (
                <p className="text-sm font-medium text-accent-700 dark:text-accent-300">
                  {track.title}
                  {pos >= 0 && ` ・ ${pos + 1}/${siblings.length}`}
                </p>
              )}
              <h1 className="text-2xl font-bold tracking-tight">{meta.title}</h1>
              <p className="leading-relaxed text-slate-600 dark:text-slate-400">{meta.summary}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <LevelBadge level={meta.level} />
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" />約 {meta.minutes} 分
                </span>
                {meta.quizCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <CircleHelp className="size-3.5" />
                    確認問題 {meta.quizCount}
                  </span>
                )}
              </div>
              <BasisInfo basis={meta.basis} asOf={meta.asOf} updated={meta.updated} />
            </header>
            <Toc meta={meta} />
            <article style={{ zoom }}>
              <LessonMarkdown body={lesson.body} />
            </article>
            {meta.changes.length > 0 && (
              <Card className="p-4 text-sm">
                <h2 className="mb-1 font-semibold">更新の記録</h2>
                <ul className="list-disc space-y-0.5 pl-5 text-slate-600 dark:text-slate-400">
                  {meta.changes.map((c) => (
                    <li key={c.date + c.note}>
                      {c.date}: {c.note}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <div className="flex justify-center pt-2">
              <Button
                variant={read ? 'secondary' : 'primary'}
                size="lg"
                onClick={() => {
                  void setLessonRead(id, !read);
                  const s = useSettings.getState();
                  if (!read && s.reaction !== 'off') {
                    const p = getPersona(s.persona, s.customPersona);
                    toast(`${p.emoji} ${reactionText(p, 'lessonRead')}`);
                  }
                }}
              >
                <CheckCircle2 />
                {read ? '読んだ（取り消す）' : '読んだ！'}
              </Button>
            </div>
            <nav className="grid grid-cols-2 gap-3" aria-label="前後のレッスン">
              <NeighborLink meta={siblings[pos - 1]} dir="prev" />
              <NeighborLink meta={siblings[pos + 1]} dir="next" />
            </nav>
          </>
        )}
      </PageBody>
    </>
  );
}
