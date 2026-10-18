import { Building2, ChevronRight, Globe2 } from 'lucide-react';
import { Link } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { useFocus } from '@/features/ai/useFocus';
import { useContentIndex } from '@/features/content/contentStore';
import { LevelBadge } from '@/features/learn/MetaBadges';
import { useUserContent } from '@/features/studio/userContentRepo';

export default function ConsolidationListPage() {
  const { index, error } = useContentIndex();
  useFocus({ kind: 'other', page: '連結の事例の一覧' });
  const lessons = index?.lessons.filter((l) => l.track === 'consolidation') ?? [];
  const mine = useUserContent()?.filter((c) => c.kind === 'consolidation') ?? [];
  return (
    <>
      <PageHeader title="連結" />
      <PageBody>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          親会社と子会社の試算表から、連結修正仕訳を入れて連結財務諸表を作ります。計算はすべてプログラムが行い、連結の金額を押すと「どの会社の・どの修正の」金額かをたどれます（ドリルダウン）。在外子会社は円に換算してから連結します。
        </p>
        {error && <p className="text-sm text-rose-600">読み込めませんでした: {error}</p>}
        <div className="grid gap-3">
          {index?.consolidations.map((c) => {
            const foreign = c.entities.some((e) => e.currency !== 'JPY');
            const Icon = foreign ? Globe2 : Building2;
            return (
              <Link key={c.id} href={`/consolidation/${c.id}`} className="group">
                <Card className="flex items-start gap-3 p-4 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c.title}</span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">
                      {c.summary}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <LevelBadge level={c.level} />
                      {c.entities
                        .map(
                          (e) =>
                            e.name.replace(/（.*）/, '') +
                            (e.currency !== 'JPY' ? `（${e.currency}）` : ''),
                        )
                        .join('・')}
                      ・修正仕訳 {c.eliminationCount}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-slate-400" />
                </Card>
              </Link>
            );
          })}
        </div>
        {mine.length > 0 && (
          <Card className="p-4 text-sm">
            <h2 className="mb-2 font-semibold">マイ教材（外部 AI で作った事例）</h2>
            <ul className="space-y-1">
              {mine.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/consolidation/${c.id}`}
                    className="text-accent-700 hover:underline dark:text-accent-300"
                  >
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <p className="text-sm">
          <Link href="/studio" className="text-accent-700 hover:underline dark:text-accent-300">
            外部 AI で連結の事例を作る
          </Link>
          （「外部 AI と連携」で「連結の事例」を選んでプロンプトをコピー）
        </p>
        {lessons.length > 0 && (
          <Card className="p-4 text-sm">
            <h2 className="mb-2 font-semibold">先にレッスンで考え方を学ぶ</h2>
            <ul className="space-y-1">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/learn/${l.id}`}
                    className="text-accent-700 hover:underline dark:text-accent-300"
                  >
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </PageBody>
    </>
  );
}
