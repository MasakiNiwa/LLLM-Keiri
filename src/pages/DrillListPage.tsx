import { ChevronRight, FileSpreadsheet, FolderHeart, ListChecks, PenLine } from 'lucide-react';
import { useUserContent } from '@/features/studio/userContentRepo';
import { Link } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { useFocus } from '@/features/ai/useFocus';
import { ReviewBanner } from '@/features/drill/ReviewBanner';
import { useContentIndex } from '@/features/content/contentStore';
import { useDrillStats } from '@/features/drill/records';
import { LevelBadge } from '@/features/learn/MetaBadges';
import { TrackIcon } from '@/features/learn/trackIcons';

export default function DrillListPage() {
  const { index, error } = useContentIndex();
  const stats = useDrillStats();
  useFocus({ kind: 'other', page: '仕訳問題の一覧' });
  const mine = useUserContent()?.filter((c) => c.kind === 'drill');
  return (
    <>
      <PageHeader title="練習" />
      <PageBody>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          仕訳の問題を解きます。勘定科目を選んで金額を入れると、プログラムがその場で採点し、どこが違うかを教えます。
        </p>
        <ReviewBanner />
        {error && <p className="text-sm text-rose-600">読み込めませんでした: {error}</p>}
        {mine && mine.length > 0 && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <FolderHeart className="size-4" />
              マイ教材
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {mine.map((c) => {
                const s = stats?.get(c.id);
                const total = c.kind === 'drill' ? c.data.questions.length : 0;
                return (
                  <Link key={c.id} href={`/drill/${c.id}`} className="group">
                    <Card className="flex h-full items-center gap-3 p-4 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{c.title}</span>
                        <span className="block text-xs text-slate-500">
                          {total} 問{s && ` ・ 正解 ${s.correct}/${total}`}
                        </span>
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-slate-400" />
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        {index && index.exercises.length > 0 && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <FileSpreadsheet className="size-4" />
              決算の総合演習
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {index.exercises.map((e) => {
                const s = stats?.get(`exercise:${e.id}`);
                return (
                  <Link key={e.id} href={`/exercise/${e.id}`} className="group">
                    <Card className="flex h-full flex-col gap-2 p-4 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <FileSpreadsheet className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold">{e.title}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{e.summary}</p>
                        </div>
                        <ChevronRight className="size-5 shrink-0 text-slate-400" />
                      </div>
                      <div className="mt-auto flex items-center gap-2 text-xs text-slate-500">
                        <LevelBadge level={e.level} />
                        <span>決算整理 {e.adjustmentCount} 問</span>
                        {s && (
                          <span className="ml-auto tabular-nums">
                            正解 {s.correct}/{e.adjustmentCount}
                          </span>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
        {index?.tracks.map((track) => {
          const sets = index.drills.filter((d) => d.track === track.id);
          const quizzes = index.quizzes.filter((q) => q.track === track.id);
          if (sets.length === 0 && quizzes.length === 0) return null;
          return (
            <section key={track.id} className="space-y-2">
              <h2 className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <TrackIcon name={track.icon} className="size-4" />
                {track.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {sets.map((d) => {
                  const s = stats?.get(d.id);
                  return (
                    <Link key={d.id} href={`/drill/${d.id}`} className="group">
                      <Card className="flex h-full flex-col gap-2 p-4 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
                        <div className="flex items-start gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                            <PenLine className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold">{d.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {d.summary}
                            </p>
                          </div>
                          <ChevronRight className="size-5 shrink-0 text-slate-400" />
                        </div>
                        <div className="mt-auto flex items-center gap-2 text-xs text-slate-500">
                          <LevelBadge level={d.level} />
                          <span>{d.questionCount} 問</span>
                          {s && (
                            <span className="ml-auto tabular-nums">
                              正解 {s.correct}/{d.questionCount}
                            </span>
                          )}
                        </div>
                        {s && <Progress value={s.correct / d.questionCount} className="h-1.5" />}
                      </Card>
                    </Link>
                  );
                })}
                {quizzes.map((q) => {
                  const s = stats?.get(`quiz:${q.id}`);
                  return (
                    <Link key={q.id} href={`/quiz/${q.id}`} className="group">
                      <Card className="flex h-full flex-col gap-2 p-4 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
                        <div className="flex items-start gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                            <ListChecks className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold">{q.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {q.summary}
                            </p>
                          </div>
                          <ChevronRight className="size-5 shrink-0 text-slate-400" />
                        </div>
                        <div className="mt-auto flex items-center gap-2 text-xs text-slate-500">
                          <LevelBadge level={q.level} />
                          <span>選択問題 {q.questionCount} 問</span>
                          {s && (
                            <span className="ml-auto tabular-nums">
                              正解 {s.correct}/{q.questionCount}
                            </span>
                          )}
                        </div>
                        {s && <Progress value={s.correct / q.questionCount} className="h-1.5" />}
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </PageBody>
    </>
  );
}
