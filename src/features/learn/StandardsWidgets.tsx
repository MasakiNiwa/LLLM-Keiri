import { useMemo } from 'react';
import { JournalTable } from '@/features/journal/JournalTable';
import type { Widget } from '@/lib/content/schema';
import { formatAmount } from '@/lib/journal/amount';
import { allocatePoints, impairment, leaseSchedule } from '@/lib/standards/standards';
import { amount, useAmounts } from './useAmounts';
import { AmountField, ResetButton } from './widgetParts';

const error = (msg: string) => <p className="text-sm text-rose-600 dark:text-rose-400">{msg}</p>;

/** ポイントへの取引価格の配分（収益認識基準） */
export function PointsWidget({ w }: { w: Extract<Widget, { type: 'points' }> }) {
  const { values, set, reset } = useAmounts({
    price: w.price,
    points: w.points,
    usageRate: w.usageRate,
  });
  const r = useMemo(
    () =>
      allocatePoints({
        price: amount(values.price),
        points: amount(values.points),
        usageRate: amount(values.usageRate),
      }),
    [values],
  );
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <AmountField label="販売価格" value={values.price} onChange={set('price')} />
        <AmountField label="付与ポイント" value={values.points} onChange={set('points')} />
        <AmountField
          label="使用見込み率（%）"
          value={values.usageRate}
          onChange={set('usageRate')}
        />
      </div>
      {r.error ? (
        error(r.error)
      ) : (
        <div className="space-y-3">
          <ul className="space-y-1 text-sm leading-relaxed">
            <li>
              ポイントの独立販売価格: {values.points} × {values.usageRate}% ＝{' '}
              <span className="font-mono">{formatAmount(r.pointsValue)}</span>
            </li>
            <li>
              ポイントへの配分: {formatAmount(amount(values.price))} × {formatAmount(r.pointsValue)}{' '}
              ÷ （{formatAmount(amount(values.price))} ＋ {formatAmount(r.pointsValue)}）＝{' '}
              <span className="font-mono">{formatAmount(r.contractLiability)}</span>（契約負債）
            </li>
            <li>
              商品への配分: <span className="font-mono">{formatAmount(r.revenue)}</span>（売上）
            </li>
          </ul>
          <JournalTable entry={r.entry} />
          <p className="text-xs leading-relaxed text-slate-500">
            ポイントが使われたら、使われた分を契約負債から売上に振り替えます。1
            円未満は四捨五入しています。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}

/** 固定資産の減損 */
export function ImpairmentWidget({ w }: { w: Extract<Widget, { type: 'impairment' }> }) {
  const { values, set, reset } = useAmounts({
    bookValue: w.bookValue,
    undiscounted: w.undiscounted,
    netSellingPrice: w.netSellingPrice,
    valueInUse: w.valueInUse,
  });
  const nums = Object.values(values).map(amount);
  const valid = nums.every((n) => Number.isInteger(n) && n >= 0);
  const r = useMemo(
    () =>
      valid
        ? impairment({
            bookValue: amount(values.bookValue),
            undiscounted: amount(values.undiscounted),
            netSellingPrice: amount(values.netSellingPrice),
            valueInUse: amount(values.valueInUse),
            account: '建物',
          })
        : null,
    [valid, values],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField label="帳簿価額" value={values.bookValue} onChange={set('bookValue')} />
        <AmountField
          label="割引前将来キャッシュ・フロー"
          value={values.undiscounted}
          onChange={set('undiscounted')}
        />
        <AmountField
          label="正味売却価額"
          value={values.netSellingPrice}
          onChange={set('netSellingPrice')}
        />
        <AmountField label="使用価値" value={values.valueInUse} onChange={set('valueInUse')} />
      </div>
      {r ? (
        <div className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed">
            {r.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          {r.entry && <JournalTable entry={r.entry} />}
        </div>
      ) : (
        error('金額を、0 以上の円の整数で入れてください')
      )}
      <ResetButton onClick={reset} />
    </>
  );
}

/** 新しいリース会計基準（借り手） */
export function LeaseWidget({ w }: { w: Extract<Widget, { type: 'lease' }> }) {
  const { values, set, reset } = useAmounts({ payment: w.payment, years: w.years, rate: w.rate });
  const rate = Number(values.rate.normalize('NFKC').replace(/[%％\s]/g, ''));
  const r = useMemo(
    () => leaseSchedule({ payment: amount(values.payment), years: amount(values.years), rate }),
    [values.payment, values.years, rate],
  );
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <AmountField label="年間のリース料" value={values.payment} onChange={set('payment')} />
        <AmountField label="期間（年）" value={values.years} onChange={set('years')} />
        <AmountField label="割引率（%）" value={values.rate} onChange={set('rate')} />
      </div>
      {r.error ? (
        error(r.error)
      ) : (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            リース料の現在価値（使用権資産・リース負債）:{' '}
            <strong className="font-mono">{formatAmount(r.presentValue)}</strong> 円 ／
            毎年の減価償却費: <span className="font-mono">{formatAmount(r.depreciation)}</span> 円
          </p>
          <JournalTable entry={r.initial} />
          <JournalTable entry={r.firstPayment} />
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                <tr>
                  {['年', '期首残高', '利息', '元本', '期末残高'].map((h) => (
                    <th key={h} className="px-2 py-1.5 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums dark:divide-slate-800">
                {r.schedule.map((row) => (
                  <tr key={row.year}>
                    <td className="px-2 py-1">{row.year}</td>
                    <td className="px-2 py-1">{formatAmount(row.opening)}</td>
                    <td className="px-2 py-1">{formatAmount(row.interest)}</td>
                    <td className="px-2 py-1">{formatAmount(row.principal)}</td>
                    <td className="px-2 py-1">{formatAmount(row.closing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            学習用の簡単なモデルです（リース料は毎年度末に支払い、利息は期首の残高 ×
            割引率を四捨五入、最後の年で端数を調整）。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}
