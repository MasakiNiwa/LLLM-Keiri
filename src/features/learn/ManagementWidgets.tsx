import { useMemo } from 'react';
import type { Widget } from '@/lib/content/schema';
import { dupont, salesVariance } from '@/lib/analysis/management';
import { formatAmount } from '@/lib/journal/amount';
import { cn } from '@/lib/utils/cn';
import { useAmounts } from './useAmounts';
import { AmountField, ResetButton } from './widgetParts';

const num = (s: string) => Number(s.normalize('NFKC').replace(/[,%％\s円]/g, ''));
const yen = (n: number) => (n < 0 ? `△${formatAmount(-n)}` : formatAmount(n));
const signed = (n: number) => (n > 0 ? `＋${formatAmount(n)}` : yen(n));
const tone = (n: number) =>
  n > 0
    ? 'text-emerald-700 dark:text-emerald-300'
    : n < 0
      ? 'text-rose-600 dark:text-rose-400'
      : '';
const label = (n: number) => (n > 0 ? '有利' : n < 0 ? '不利' : '差異なし');

/** 売上高の予実差異（価格差異と数量差異） */
export function SalesVarianceWidget({ w }: { w: Extract<Widget, { type: 'sales-variance' }> }) {
  const { type: _t, ...init } = w;
  const { values, set, reset } = useAmounts(init);
  const r = useMemo(
    () =>
      salesVariance({
        budgetPrice: num(values.budgetPrice),
        budgetQuantity: num(values.budgetQuantity),
        actualPrice: num(values.actualPrice),
        actualQuantity: num(values.actualQuantity),
      }),
    [values],
  );
  const rows = [
    {
      name: '価格差異',
      formula: '（実績単価 − 予算単価）× 実績数量',
      value: r.price,
    },
    {
      name: '数量差異',
      formula: '（実績数量 − 予算数量）× 予算単価',
      value: r.quantity,
    },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField
          label="予算の販売単価"
          value={values.budgetPrice}
          onChange={set('budgetPrice')}
        />
        <AmountField
          label="予算の販売数量"
          value={values.budgetQuantity}
          onChange={set('budgetQuantity')}
        />
        <AmountField
          label="実績の販売単価"
          value={values.actualPrice}
          onChange={set('actualPrice')}
        />
        <AmountField
          label="実績の販売数量"
          value={values.actualQuantity}
          onChange={set('actualQuantity')}
        />
      </div>
      {r.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{r.error}</p>
      ) : (
        <div className="space-y-2 text-sm">
          <p>
            予算 <span className="font-mono">{formatAmount(r.budgetSales)}</span> 円 → 実績{' '}
            <span className="font-mono">{formatAmount(r.actualSales)}</span> 円（総差異{' '}
            <strong className={cn('font-mono', tone(r.total))}>{yen(r.total)}</strong> 円・
            {label(r.total)}）
          </p>
          <div className="space-y-1">
            {rows.map((x) => (
              <div
                key={x.name}
                className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
              >
                <span>
                  {x.name}
                  <span className="ml-2 text-xs text-slate-500">{x.formula}</span>
                </span>
                <span className={cn('font-mono font-semibold', tone(x.value))}>
                  {yen(x.value)} 円（{label(x.value)}）
                </span>
              </div>
            ))}
          </div>
          <p className="rounded-xl bg-accent-50 px-3 py-2 dark:bg-accent-900/30">
            報告の一文:「売上高は予算比 {signed(r.total)} 円。値引きなど単価の要因で{' '}
            {signed(r.price)} 円、販売数量の要因で {signed(r.quantity)} 円」
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            学習用に 1 品目で計算しています。品目が複数のときは、品目ごとに計算して合計します。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}

/** ROE のデュポン分解 */
export function DupontWidget({ w }: { w: Extract<Widget, { type: 'dupont' }> }) {
  const { type: _t, ...init } = w;
  const { values, set, reset } = useAmounts(init);
  const r = useMemo(
    () =>
      dupont({
        netIncome: num(values.netIncome),
        sales: num(values.sales),
        totalAssets: num(values.totalAssets),
        equity: num(values.equity),
      }),
    [values],
  );
  const parts = [
    {
      name: '売上高純利益率',
      formula: '当期純利益 ÷ 売上高',
      value: `${r.margin}%`,
      hint: 'もうける力',
    },
    {
      name: '総資産回転率',
      formula: '売上高 ÷ 総資産',
      value: `${r.turnover} 回`,
      hint: '資産を使う効率',
    },
    {
      name: '財務レバレッジ',
      formula: '総資産 ÷ 自己資本',
      value: `${r.leverage} 倍`,
      hint: '借入れの使い方',
    },
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField label="当期純利益" value={values.netIncome} onChange={set('netIncome')} />
        <AmountField label="売上高" value={values.sales} onChange={set('sales')} />
        <AmountField label="総資産" value={values.totalAssets} onChange={set('totalAssets')} />
        <AmountField label="自己資本（純資産）" value={values.equity} onChange={set('equity')} />
      </div>
      {r.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{r.error}</p>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="grid gap-2 sm:grid-cols-3">
            {parts.map((p) => (
              <div key={p.name} className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                <div className="text-xs text-slate-500">
                  {p.name}（{p.hint}）
                </div>
                <div className="font-mono text-base font-semibold">{p.value}</div>
                <div className="text-xs text-slate-500">{p.formula}</div>
              </div>
            ))}
          </div>
          <p className="rounded-xl bg-accent-50 px-3 py-2 dark:bg-accent-900/30">
            ROE ＝ {r.margin}% × {r.turnover} × {r.leverage} ＝ <strong>{r.roe}%</strong>
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            ROA {r.roa}%・自己資本比率 {r.equityRatio}%。同じ ROE
            でも、利益率で稼いでいるのか、借入れで膨らませているのかで意味が変わります。
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            学習用に期末の残高で計算しています（期首と期末の平均を使う方法もあります）。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}
