import { useMemo } from 'react';
import type { Widget } from '@/lib/content/schema';
import { formatAmount } from '@/lib/journal/amount';
import { beppyo4, type Beppyo4Row } from '@/lib/tax/beppyo4';
import { cn } from '@/lib/utils/cn';
import { amount, useAmounts } from './useAmounts';
import { AmountField, ResetButton } from './widgetParts';

const yen = (n: number) => (n < 0 ? `△${formatAmount(-n)}` : formatAmount(n));

/** 別表四（所得の金額の計算に関する明細書）の簡単な形 */
export function Beppyo4Widget({ w }: { w: Extract<Widget, { type: 'beppyo4' }> }) {
  const { values, set, reset } = useAmounts({
    netIncome: w.netIncome,
    dividends: w.dividends,
    provision: w.provision,
    entertainment: w.entertainment,
    depreciation: w.depreciation,
    enterpriseTax: w.enterpriseTax,
    dividendExclusion: w.dividendExclusion,
  });
  const rate = w.rate;
  const r = useMemo(
    () =>
      beppyo4({
        netIncome: amount(values.netIncome),
        dividends: amount(values.dividends),
        rate: w.rate,
        items: [
          {
            label: '損金経理をした納税充当金',
            amount: amount(values.provision),
            kind: 'add',
            disposition: 'retained',
          },
          {
            label: '交際費等の損金不算入額',
            amount: amount(values.entertainment),
            kind: 'add',
            disposition: 'outflow',
          },
          {
            label: '減価償却の償却超過額',
            amount: amount(values.depreciation),
            kind: 'add',
            disposition: 'retained',
          },
          {
            label: '納税充当金から支出した事業税等',
            amount: amount(values.enterpriseTax),
            kind: 'deduct',
            disposition: 'retained',
          },
          {
            label: '受取配当等の益金不算入額',
            amount: amount(values.dividendExclusion),
            kind: 'deduct',
            disposition: 'outflow',
          },
        ],
      }),
    [values, w.rate],
  );
  const valid = Object.values(values).every((v) => Number.isFinite(amount(v as string)));
  const line = (x: Beppyo4Row, strong?: boolean) => (
    <tr key={x.label} className={cn(strong && 'font-semibold')}>
      <td className={cn('px-2 py-1', x.kind && 'pl-4')}>
        {x.kind === 'add' && <span className="mr-1 text-xs text-rose-600">加算</span>}
        {x.kind === 'deduct' && <span className="mr-1 text-xs text-sky-600">減算</span>}
        {x.label}
      </td>
      <td className="px-2 py-1 text-right font-mono tabular-nums">{yen(x.total)}</td>
      <td className="px-2 py-1 text-right font-mono tabular-nums">{yen(x.retained)}</td>
      <td className="px-2 py-1 text-right font-mono tabular-nums">{yen(x.outflow)}</td>
    </tr>
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField label="当期利益" value={values.netIncome} onChange={set('netIncome')} />
        <AmountField
          label="うち配当（社外流出）"
          value={values.dividends}
          onChange={set('dividends')}
        />
        <AmountField
          label="納税充当金（加算・留保）"
          value={values.provision}
          onChange={set('provision')}
        />
        <AmountField
          label="交際費の損金不算入（加算・流出）"
          value={values.entertainment}
          onChange={set('entertainment')}
        />
        <AmountField
          label="減価償却超過額（加算・留保）"
          value={values.depreciation}
          onChange={set('depreciation')}
        />
        <AmountField
          label="事業税等の支払い（減算・留保）"
          value={values.enterpriseTax}
          onChange={set('enterpriseTax')}
        />
        <AmountField
          label="受取配当の益金不算入（減算・流出）"
          value={values.dividendExclusion}
          onChange={set('dividendExclusion')}
        />
      </div>
      {!valid ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">金額を数字で入れてください</p>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[30rem] text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">区分</th>
                  <th className="px-2 py-1.5 text-right font-medium">総額</th>
                  <th className="px-2 py-1.5 text-right font-medium">留保</th>
                  <th className="px-2 py-1.5 text-right font-medium">社外流出</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {line(r.rows[0], true)}
                {r.rows.filter((x) => x.kind === 'add').map((x) => line(x))}
                {line(r.addTotal)}
                {r.rows.filter((x) => x.kind === 'deduct').map((x) => line(x))}
                {line(r.deductTotal)}
                {line(r.income, true)}
              </tbody>
            </table>
          </div>
          <p>
            所得金額 {yen(r.income.total)} → 課税標準（1,000 円未満切り捨て）
            {formatAmount(r.taxableIncome)} × 税率 {rate}% ＝ 法人税額{' '}
            <strong className="font-mono">{formatAmount(r.tax)}</strong> 円（100 円未満切り捨て）
          </p>
          <p>
            留保の {yen(r.income.retained)} は、別表五(一)
            の利益積立金額の増加として翌期に引き継ぎます。
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            学習用の簡単な形です。税率は普通法人の基本の税率（{rate}
            %）で、中小法人の軽減税率・税額控除・地方法人税などは考えていません。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}
