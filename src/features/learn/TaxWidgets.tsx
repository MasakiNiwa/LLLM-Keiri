import { useMemo, useState } from 'react';
import type { Widget } from '@/lib/content/schema';
import { formatAmount } from '@/lib/journal/amount';
import { beppyo4, type Beppyo4Row } from '@/lib/tax/beppyo4';
import { localTax } from '@/lib/tax/localTax';
import { taxReturn } from '@/lib/tax/taxReturn';
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

const TAX_RETURN_FIELDS = [
  ['netIncome', '当期利益（損益計算書）'],
  ['dividends', '当期に支払った配当'],
  ['interimCorporateTax', '損金経理をした法人税（中間）'],
  ['interimResidentTax', '損金経理をした住民税（中間）'],
  ['provision', '納税充当金の繰入額'],
  ['provisionOpening', '期首の納税充当金'],
  ['provisionUsed', '納税充当金の取り崩し（前期分の納付）'],
  ['provisionUsedEnterpriseTax', 'うち事業税など'],
  ['entertainment', '交際費等の支出額'],
  ['entertainmentMeals', 'うち接待飲食費'],
  ['depreciationExcess', '減価償却の償却超過額'],
  ['dividendExclusion', '受取配当等の益金不算入額'],
] as const;

/** 法人税申告書の通し（別表十五 → 別表四 → 別表一 → 別表五(一)） */
export function TaxReturnWidget({ w }: { w: Extract<Widget, { type: 'tax-return' }> }) {
  const { type: _t, smallCompany: initialSmall, ...init } = w;
  const { values, set, reset } = useAmounts(init);
  const [small, setSmall] = useState(initialSmall);
  const valid = Object.values(values).every((v) => Number.isFinite(amount(v as string)));
  const r = useMemo(() => {
    const n = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, amount(v as string)]),
    ) as Record<keyof typeof init, number>;
    return taxReturn({ ...n, smallCompany: small });
  }, [values, small]);
  const b4 = r.beppyo4;
  const cell = 'px-2 py-1 text-right font-mono tabular-nums';
  const line = (x: Beppyo4Row, strong?: boolean) => (
    <tr key={x.label} className={cn(strong && 'font-semibold')}>
      <td className={cn('px-2 py-1', x.kind && 'pl-4')}>
        {x.kind === 'add' && <span className="mr-1 text-xs text-rose-600">加算</span>}
        {x.kind === 'deduct' && <span className="mr-1 text-xs text-sky-600">減算</span>}
        {x.label}
      </td>
      <td className={cell}>{yen(x.total)}</td>
      <td className={cell}>{yen(x.retained)}</td>
      <td className={cell}>{yen(x.outflow)}</td>
    </tr>
  );
  const h3 = 'font-semibold text-slate-800 dark:text-slate-200';
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {TAX_RETURN_FIELDS.map(([k, label]) => (
          <AmountField key={k} label={label} value={values[k]} onChange={set(k)} />
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={small} onChange={(e) => setSmall(e.target.checked)} />
        中小法人（資本金 1 億円以下など）
      </label>
      {!valid ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">金額を数字で入れてください</p>
      ) : (
        <div className="space-y-3 text-sm">
          <section className="space-y-1">
            <h3 className={h3}>1. 別表十五（交際費等）</h3>
            <p>
              損金にできる限度額 {formatAmount(r.entertainment.limit)}（{r.entertainment.method}
              ）→ 損金不算入額{' '}
              <strong className="font-mono">{formatAmount(r.entertainment.nondeductible)}</strong>
            </p>
          </section>
          <section className="space-y-1">
            <h3 className={h3}>2. 別表四（所得の金額）</h3>
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
                  {line(b4.rows[0], true)}
                  {b4.rows.filter((x) => x.kind === 'add').map((x) => line(x))}
                  {line(b4.addTotal)}
                  {b4.rows.filter((x) => x.kind === 'deduct').map((x) => line(x))}
                  {line(b4.deductTotal)}
                  {line(b4.income, true)}
                </tbody>
              </table>
            </div>
          </section>
          <section className="space-y-1">
            <h3 className={h3}>3. 別表一（法人税額）</h3>
            <p>
              課税標準（1,000 円未満切り捨て）
              <span className="font-mono"> {formatAmount(r.beppyo1.taxableIncome)}</span>
            </p>
            <ul className="list-disc space-y-0.5 pl-5">
              {r.beppyo1.brackets.map((b) => (
                <li key={b.label}>
                  {b.label} {formatAmount(b.base)} × {b.rate}% ＝{' '}
                  <span className="font-mono">{formatAmount(b.tax)}</span>
                </li>
              ))}
            </ul>
            <p>
              法人税額 {formatAmount(r.beppyo1.corporateTax)} − 中間申告分{' '}
              {formatAmount(r.beppyo1.interim)} ＝ 差引の納付額{' '}
              <strong className="font-mono">{yen(r.beppyo1.payable)}</strong>
              （100 円未満切り捨て）
            </p>
          </section>
          <section className="space-y-1">
            <h3 className={h3}>4. 別表五(一)（利益積立金額の一部）</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full min-w-[28rem] text-xs">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    {['区分', '期首', '減', '増', '期末'].map((h, i) => (
                      <th
                        key={h}
                        className={cn('px-2 py-1.5 font-medium', i ? 'text-right' : 'text-left')}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {r.beppyo5.map((x) => (
                    <tr key={x.label}>
                      <td className="px-2 py-1">{x.label}</td>
                      <td className={cell}>{yen(x.opening)}</td>
                      <td className={cell}>{yen(x.decrease)}</td>
                      <td className={cell}>{yen(x.increase)}</td>
                      <td className={cn(cell, 'font-semibold')}>{yen(x.closing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <p className="text-xs leading-relaxed text-slate-500">
            学習用の簡単な形です。地方法人税・住民税・事業税の計算、税額控除、欠損金は考えていません。中小法人の軽減税率（15%）は特例の税率で、適用期限があります。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}

/** 地方法人税・住民税・事業税（標準税率） */
export function LocalTaxWidget({ w }: { w: Extract<Widget, { type: 'local-tax' }> }) {
  const { type: _t, noReducedRate: initialNoReduced, ...init } = w;
  const { values, set, reset } = useAmounts(init);
  const [noReduced, setNoReduced] = useState(initialNoReduced);
  const r = useMemo(
    () =>
      localTax({
        corporateTax: amount(values.corporateTax),
        income: amount(values.income),
        capital: amount(values.capital),
        employees: amount(values.employees),
        months: amount(values.months),
        noReducedRate: noReduced,
      }),
    [values, noReduced],
  );
  const deductible = r.lines.filter((l) => l.deductible).reduce((s, l) => s + l.amount, 0);
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField
          label="法人税額（別表一）"
          value={values.corporateTax}
          onChange={set('corporateTax')}
        />
        <AmountField label="所得金額（別表四）" value={values.income} onChange={set('income')} />
        <AmountField label="資本金等の額" value={values.capital} onChange={set('capital')} />
        <AmountField label="従業者数（人）" value={values.employees} onChange={set('employees')} />
        <AmountField label="事業年度の月数" value={values.months} onChange={set('months')} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={noReduced}
          onChange={(e) => setNoReduced(e.target.checked)}
        />
        事業税の軽減税率を使えない（3 以上の都道府県に事務所があり、資本金 1,000 万円以上）
      </label>
      {r.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{r.error}</p>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium">税目と計算</th>
                  <th className="px-2 py-1.5 text-right font-medium">税額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {r.lines.map((l) => (
                  <tr key={l.label}>
                    <td className="px-2 py-1">
                      {l.label}
                      {l.deductible && (
                        <span className="ml-1 text-[0.65rem] text-emerald-700 dark:text-emerald-300">
                          損金
                        </span>
                      )}
                      <span className="block text-slate-500">{l.formula}</span>
                    </td>
                    <td className="px-2 py-1 text-right font-mono tabular-nums">
                      {formatAmount(l.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="px-2 py-1">合計</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">
                    {formatAmount(r.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            事業税・特別法人事業税（{formatAmount(deductible)}
            円）は、申告して納めた期（翌期）の損金になります。住民税・地方法人税は損金になりません。
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            標準税率で計算しています（2019 年 10 月 1
            日以後に開始する事業年度）。都道府県・市町村によっては、条例で標準税率より高い税率（超過課税）や、均等割の上乗せがあります。外形標準課税の対象の法人（資本金
            1 億円超など）は計算が違います。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}
