import { useLiveQuery } from 'dexie-react-hooks';
import { BookOpenText, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { Card } from '@/components/ui/Card';
import { useContentIndex } from '@/features/content/contentStore';
import { db } from '@/lib/db/db';

/** ホーム: 最後に開いたレッスンの続きと、次に読むレッスン */
export function ContinueCard() {
  const { index } = useContentIndex();
  const progress = useLiveQuery(() => db.lessonProgress.toArray(), []);
  if (!index || !progress) return null;
  const last = [...progress].sort((a, b) => b.openedAt - a.openedAt)[0];
  const read = new Set(progress.filter((p) => p.readAt).map((p) => p.lessonId));
  const lastMeta = last && index.lessons.find((l) => l.id === last.lessonId);
  // 最後に開いたレッスンを読み終えていれば、その次の未読のレッスン
  const next =
    lastMeta && !read.has(lastMeta.id)
      ? lastMeta
      : (index.lessons.find((l) => !read.has(l.id)) ?? lastMeta);
  if (!next) return null;
  const total = index.lessons.length;
  const done = index.lessons.filter((l) => read.has(l.id)).length;
  const track = index.tracks.find((t) => t.id === next.track);
  return (
    <Link href={`/learn/${next.id}`} className="group block">
      <Card className="flex items-center gap-3 p-4 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-600 text-white">
          <BookOpenText className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-accent-700 dark:text-accent-300">
            {progress.length === 0 ? 'はじめの一歩' : '続きから'}
            {track && ` ・ ${track.title}`}
          </span>
          <span className="block truncate font-semibold">{next.title}</span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            読んだレッスン {done}/{total}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-slate-400" />
      </Card>
    </Link>
  );
}
