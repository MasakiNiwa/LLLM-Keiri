import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { useSettings } from '@/features/settings/settingsStore';
import type { ReviewRecord } from '@/lib/db/db';
import { forecast, isDue, memoryStage, retrievability, type MemoryStage } from '@/lib/srs/review';
import { cn } from '@/lib/utils/cn';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

const STAGES: { key: MemoryStage; label: string; className: string }[] = [
  { key: 'learning', label: '覚えはじめ', className: 'bg-amber-400 dark:bg-amber-500' },
  { key: 'young', label: '定着中', className: 'bg-accent-400 dark:bg-accent-500' },
  { key: 'mature', label: '長期記憶', className: 'bg-accent-700 dark:bg-accent-300' },
];

const GOALS = [10, 20, 30, 50, 100, 0];

/** 復習の予定と記憶の状態（FSRS） */
export function ReviewOverview({ records }: { records: ReviewRecord[] }) {
  const [now] = useState(() => Date.now());
  const goal = useSettings((s) => s.reviewGoal);
  const update = useSettings((s) => s.update);
  const stats = useMemo(() => {
    const days = forecast(records, now, 14);
    const counts: Record<MemoryStage, number> = { learning: 0, young: 0, mature: 0 };
    let sum = 0;
    let n = 0;
    for (const r of records) {
      counts[memoryStage(r)]++;
      const p = retrievability(r, now);
      if (p !== null) {
        sum += p;
        n++;
      }
    }
    return {
      days,
      counts,
      due: records.filter((r) => isDue(r, now)).length,
      average: n ? Math.round((sum / n) * 100) : null,
    };
  }, [records, now]);
  const max = Math.max(1, ...stats.days.map((d) => d.count));
  const total = records.length;
  return (
    <Card className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: '今日の復習', value: `${stats.due} 件` },
          {
            label: '記憶の定着度',
            value: stats.average === null ? '—' : `${stats.average}%`,
          },
          { label: '長期記憶', value: `${stats.counts.mature}/${total}` },
        ].map((t) => (
          <div key={t.label} className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500">{t.label}</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">{t.value}</div>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold">これから 14 日の復習の予定</h2>
        <div className="flex h-28 items-end gap-1" role="img" aria-label="日ごとの復習の数">
          {stats.days.map((d, i) => {
            const date = new Date(`${d.date}T00:00:00`);
            return (
              <div key={d.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span className="text-[0.6rem] text-slate-500 tabular-nums">{d.count || ''}</span>
                <div
                  className={cn(
                    'w-full rounded-t-sm',
                    i === 0
                      ? 'bg-accent-600 dark:bg-accent-400'
                      : 'bg-accent-300 dark:bg-accent-700',
                  )}
                  style={{ height: `${(d.count / max) * 64}px` }}
                  title={`${d.date}: ${d.count} 問`}
                />
                <span
                  className={cn(
                    'text-[0.6rem] tabular-nums',
                    i === 0
                      ? 'font-semibold text-accent-700 dark:text-accent-300'
                      : 'text-slate-500',
                    date.getDay() === 0 && i !== 0 && 'text-rose-500',
                  )}
                >
                  {i === 0 ? '今日' : date.getDate()}
                </span>
                <span className="text-[0.55rem] text-slate-400">{WEEK[date.getDay()]}</span>
              </div>
            );
          })}
        </div>
      </section>

      {total > 0 && (
        <section className="space-y-1.5">
          <h2 className="text-sm font-semibold">記憶の段階（{total} 問）</h2>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            {STAGES.map((st) =>
              stats.counts[st.key] ? (
                <div
                  key={st.key}
                  className={st.className}
                  style={{ width: `${(stats.counts[st.key] / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
            {STAGES.map((st) => (
              <span key={st.key} className="flex items-center gap-1">
                <span className={cn('size-2.5 rounded-sm', st.className)} />
                {st.label} {stats.counts[st.key]}
              </span>
            ))}
          </div>
        </section>
      )}

      <label className="flex items-center gap-3 text-sm">
        <span className="flex-1">
          1 日の復習の目標
          <span className="block text-xs text-slate-500">達成したあとも、続けて復習できます</span>
        </span>
        <Select
          value={String(goal)}
          onChange={(v) => update({ reviewGoal: Number(v) })}
          options={GOALS.map((g) => ({ value: String(g), label: g ? `${g} 件` : '目標なし' }))}
          className="w-28"
        />
      </label>

      <details className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-300">
          復習のしくみ（忘却曲線と FSRS）
        </summary>
        <div className="mt-2 space-y-1.5">
          <p>
            人は覚えたことを時間とともに忘れていきます（忘却曲線）。忘れかけたころに思い出すと、記憶が強くなり、次に忘れるまでの期間がのびます。
          </p>
          <p>
            このアプリは、記憶のアルゴリズム <strong>FSRS</strong>
            で、問題ごとに「いま思い出せる確率（記憶の定着度）」を見積もり、それが 90%
            まで下がるころを次の復習の日にします。間違えた問題は近いうちに、正解した問題は間隔をのばして出します。
          </p>
          <p>
            正解したあとに「むずかしかった・かんたん」を選ぶと、次の間隔を短く・長く調整します。記憶の段階は、次に忘れるまでの見込みで、7
            日未満を「覚えはじめ」、21 日未満を「定着中」、21 日以上を「長期記憶」としています。
          </p>
        </div>
      </details>
    </Card>
  );
}
