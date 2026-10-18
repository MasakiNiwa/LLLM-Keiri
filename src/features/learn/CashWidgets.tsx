import { useMemo } from 'react';
import type { Widget } from '@/lib/content/schema';
import { cashPlan, workingCapital } from '@/lib/cash/cash';
import { formatAmount } from '@/lib/journal/amount';
import { cn } from '@/lib/utils/cn';
import { useAmounts } from './useAmounts';
import { AmountField, ResetButton } from './widgetParts';

const num = (s: string) => Number(s.normalize('NFKC').replace(/[,%％\s円]/g, ''));
const yen = (n: number) => (n < 0 ? `△${formatAmount(-n)}` : formatAmount(n));

/** 運転資金と CCC */
export function WorkingCapitalWidget({ w }: { w: Extract<Widget, { type: 'working-capital' }> }) {
  const { type: _t, ...init } = w;
  const { values, set, reset } = useAmounts(init);
  const r = useMemo(
    () =>
      workingCapital({
        sales: num(values.sales),
        cogs: num(values.cogs),
        receivables: num(values.receivables),
        inventory: num(values.inventory),
        payables: num(values.payables),
      }),
    [values],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AmountField label="年間の売上高" value={values.sales} onChange={set('sales')} />
        <AmountField label="年間の売上原価" value={values.cogs} onChange={set('cogs')} />
        <AmountField
          label="売上債権（売掛金など）"
          value={values.receivables}
          onChange={set('receivables')}
        />
        <AmountField
          label="棚卸資産（在庫）"
          value={values.inventory}
          onChange={set('inventory')}
        />
        <AmountField
          label="仕入債務（買掛金など）"
          value={values.payables}
          onChange={set('payables')}
        />
      </div>
      {r.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{r.error}</p>
      ) : (
        <div className="space-y-2 text-sm">
          <ul className="space-y-1 leading-relaxed">
            <li>売上債権回転日数（DSO）＝ 売上債権 ÷（売上高 ÷ 365）＝ {r.dso} 日</li>
            <li>棚卸資産回転日数（DIO）＝ 棚卸資産 ÷（売上原価 ÷ 365）＝ {r.dio} 日</li>
            <li>仕入債務回転日数（DPO）＝ 仕入債務 ÷（売上原価 ÷ 365）＝ {r.dpo} 日</li>
          </ul>
          <p className="rounded-xl bg-accent-50 px-3 py-2 dark:bg-accent-900/30">
            CCC ＝ {r.dso} ＋ {r.dio} − {r.dpo} ＝ <strong>{r.ccc} 日</strong>
            （仕入れの支払いから売上の回収まで、お金が寝ている日数）
          </p>
          <p>
            必要運転資金 ＝ 売上債権 ＋ 棚卸資産 − 仕入債務 ＝{' '}
            <strong className="font-mono">{yen(r.workingCapital)}</strong> 円。売上が 10%
            伸びると、およそ <span className="font-mono">{formatAmount(r.increaseIfGrow10)}</span>{' '}
            円の資金が新たに必要になります。
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

/** 資金繰り表（売上の伸び・回収と支払いのずれで、残高がどう動くか） */
export function CashPlanWidget({ w }: { w: Extract<Widget, { type: 'cash-plan' }> }) {
  const { type: _t, ...init } = w;
  const { values, set, reset } = useAmounts(init);
  const r = useMemo(
    () =>
      cashPlan({
        months: num(values.months),
        openingCash: num(values.openingCash),
        sales: num(values.sales),
        growth: num(values.growth),
        cashSalesRate: num(values.cashSalesRate),
        collectionLag: Math.min(3, Math.max(0, Math.round(num(values.collectionLag)))),
        costRate: num(values.costRate),
        paymentLag: Math.min(3, Math.max(0, Math.round(num(values.paymentLag)))),
        expenses: num(values.expenses),
        loanMonth: num(values.loanMonth),
        loanAmount: num(values.loanAmount),
        repayment: num(values.repayment),
        minimumCash: num(values.minimumCash),
      }),
    [values],
  );
  const valid = Object.values(values).every((v) => Number.isFinite(num(v as string)));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AmountField
          label="期首の現金預金"
          value={values.openingCash}
          onChange={set('openingCash')}
        />
        <AmountField label="1 か月目の売上高" value={values.sales} onChange={set('sales')} />
        <AmountField label="売上の月の伸び（%）" value={values.growth} onChange={set('growth')} />
        <AmountField
          label="現金売上の割合（%）"
          value={values.cashSalesRate}
          onChange={set('cashSalesRate')}
        />
        <AmountField
          label="掛けの回収（何か月後）"
          value={values.collectionLag}
          onChange={set('collectionLag')}
        />
        <AmountField label="原価率（%）" value={values.costRate} onChange={set('costRate')} />
        <AmountField
          label="仕入の支払い（何か月後）"
          value={values.paymentLag}
          onChange={set('paymentLag')}
        />
        <AmountField label="毎月の経費" value={values.expenses} onChange={set('expenses')} />
        <AmountField
          label="借入れの月（0 は無し）"
          value={values.loanMonth}
          onChange={set('loanMonth')}
        />
        <AmountField label="借入額" value={values.loanAmount} onChange={set('loanAmount')} />
        <AmountField label="毎月の返済額" value={values.repayment} onChange={set('repayment')} />
        <AmountField
          label="最低限残したい残高"
          value={values.minimumCash}
          onChange={set('minimumCash')}
        />
        <AmountField label="月数" value={values.months} onChange={set('months')} />
      </div>
      {!valid ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">数値を入れてください</p>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[36rem] text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                <tr>
                  {[
                    '月',
                    '前月繰越',
                    '経常収入',
                    '経常支出',
                    '経常収支',
                    '財務収支',
                    '翌月繰越',
                    '損益',
                  ].map((h) => (
                    <th key={h} className="px-2 py-1.5 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums dark:divide-slate-800">
                {r.rows.map((x) => (
                  <tr key={x.month} className={cn(x.short && 'bg-rose-50 dark:bg-rose-950/30')}>
                    <td className="px-2 py-1">{x.month}</td>
                    <td className="px-2 py-1">{yen(x.opening)}</td>
                    <td className="px-2 py-1">{yen(x.receipts)}</td>
                    <td className="px-2 py-1">{yen(-x.payments)}</td>
                    <td className="px-2 py-1">{yen(x.operating)}</td>
                    <td className="px-2 py-1">{x.financing ? yen(x.financing) : '—'}</td>
                    <td
                      className={cn(
                        'px-2 py-1 font-semibold',
                        x.short && 'text-rose-600 dark:text-rose-400',
                      )}
                    >
                      {yen(x.closing)}
                    </td>
                    <td className="px-2 py-1 text-slate-500">{yen(x.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p
            className={cn(
              'rounded-xl px-3 py-2 font-medium',
              r.firstShortMonth
                ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
            )}
          >
            {r.firstShortMonth
              ? `${r.firstShortMonth} か月目に残高が最低限（${formatAmount(num(values.minimumCash))} 円）を下回ります。損益の合計は ${yen(r.totalProfit)} 円なのに、お金は${r.cashChange < 0 ? ` ${formatAmount(-r.cashChange)} 円減っています。` : ` ${formatAmount(r.cashChange)} 円しか増えていません。`}`
              : `最低限の残高を保てています（損益の合計 ${yen(r.totalProfit)} 円、お金の増減 ${yen(r.cashChange)} 円）。`}
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            学習用の簡単なモデルです（表の前の月も 1
            か月目と同じ売上、仕入は売上と同じ月、経費はその月に支払い、税金・設備投資は考えない）。回収を早める・支払いを延ばす・借入れを入れるなど、数字を変えて試してみましょう。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}
