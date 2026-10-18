import { Card } from '@/components/ui/Card';
import {
  SEGMENT_METRICS,
  type SegmentMetric,
  type SegmentReport,
} from '@/lib/consolidation/segments';
import type { ConsolidationCase } from '@/lib/content/schema';
import { cn } from '@/lib/utils/cn';
import type { ConsolidationDrillItem } from './ConsolidationDrill';
import { triangle } from './format';

const mono = 'font-mono tabular-nums';

type Row = {
  label: string;
  indent?: boolean;
  metric: SegmentMetric;
  /** セグメントの金額 */
  value: (s: SegmentReport['segments'][number]) => number;
  /** 調整額 */
  adjustment: number;
  consolidated: number;
  strong?: boolean;
};

/** セグメント情報（報告セグメントごとの売上高・利益・資産と、連結との調整） */
export function SegmentsView({
  c,
  report,
  onDrill,
}: {
  c: ConsolidationCase;
  report: SegmentReport;
  onDrill: (item: ConsolidationDrillItem) => void;
}) {
  const { segments, adjustmentTotals: adj, consolidated } = report;
  const inter = segments.reduce((s, x) => s + x.intersegmentSales, 0);
  const rows: Row[] = [
    {
      label: '外部顧客への売上高',
      indent: true,
      metric: 'sales',
      value: (s) => s.values.sales - s.intersegmentSales,
      // セグメント間の分を除いた調整額（グループ外への売上の修正など）
      adjustment: adj.sales + inter,
      consolidated: consolidated.sales,
    },
    {
      label: 'セグメント間の内部売上高',
      indent: true,
      metric: 'sales',
      value: (s) => s.intersegmentSales,
      adjustment: -inter,
      consolidated: 0,
    },
    {
      label: '売上高 計',
      metric: 'sales',
      value: (s) => s.values.sales,
      adjustment: adj.sales,
      consolidated: consolidated.sales,
      strong: true,
    },
    {
      label: SEGMENT_METRICS.profit,
      metric: 'profit',
      value: (s) => s.values.profit,
      adjustment: adj.profit,
      consolidated: consolidated.profit,
      strong: true,
    },
    {
      label: SEGMENT_METRICS.assets,
      metric: 'assets',
      value: (s) => s.values.assets,
      adjustment: adj.assets,
      consolidated: consolidated.assets,
      strong: true,
    },
  ];
  const cell = 'px-3 py-2 text-right whitespace-nowrap';
  const button =
    'rounded-md underline decoration-slate-300 decoration-dotted underline-offset-4 hover:bg-accent-50 hover:text-accent-800 dark:decoration-slate-600 dark:hover:bg-accent-900/30 dark:hover:text-accent-200';
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <h2 className="px-3 pt-3 pb-2 font-semibold">報告セグメントごとの金額</h2>
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 text-left font-medium" />
                {segments.map((s) => (
                  <th key={s.name} className={cn(cell, 'font-medium')}>
                    {s.name}
                  </th>
                ))}
                <th className={cn(cell, 'font-medium')}>計</th>
                <th className={cn(cell, 'font-medium')}>調整額</th>
                <th className={cn(cell, 'font-medium')}>連結</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => {
                const total = segments.reduce((sum, s) => sum + r.value(s), 0);
                return (
                  <tr key={r.label} className={cn(r.strong && 'font-medium')}>
                    <th
                      scope="row"
                      className={cn(
                        'px-3 py-2 text-left font-normal whitespace-nowrap',
                        r.indent && 'pl-6 text-slate-600 dark:text-slate-400',
                        r.strong && 'font-medium',
                      )}
                    >
                      {r.label}
                    </th>
                    {segments.map((s) => (
                      <td key={s.name} className={cn(cell, mono)}>
                        <button
                          type="button"
                          className={button}
                          onClick={() =>
                            onDrill({
                              kind: 'segment',
                              segment: s.name,
                              metric: r.metric,
                              intersegment: r.label === 'セグメント間の内部売上高',
                            })
                          }
                        >
                          {triangle(r.value(s))}
                        </button>
                      </td>
                    ))}
                    <td className={cn(cell, mono)}>{triangle(total)}</td>
                    <td className={cn(cell, mono, 'text-amber-700 dark:text-amber-300')}>
                      {r.adjustment === 0 ? (
                        '—'
                      ) : (
                        <button
                          type="button"
                          className={button}
                          onClick={() => onDrill({ kind: 'adjustment', metric: r.metric })}
                        >
                          {triangle(r.adjustment)}
                        </button>
                      )}
                    </td>
                    <td className={cn(cell, mono, 'font-semibold')}>{triangle(r.consolidated)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        単位: {c.unit}。△
        はマイナス。セグメントの金額は、そのセグメントの会社の金額の合計（連結修正の前）です。
        セグメントの「計」に「調整額」（連結修正仕訳の分）を加えると、連結の金額になります。金額を押すと内訳を表示します。
        学習用に、セグメント利益は営業利益、セグメント資産は各社の資産の合計としています。
      </p>
    </div>
  );
}
