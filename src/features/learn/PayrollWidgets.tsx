import { useMemo, useState } from 'react';
import { JournalTable } from '@/features/journal/JournalTable';
import type { Widget } from '@/lib/content/schema';
import { formatAmount } from '@/lib/journal/amount';
import { monthlyPay } from '@/lib/payroll/monthly';
import { LATEST_TAX_YEAR, rulesFor, TAX_YEARS } from '@/lib/payroll/taxYears';
import { monthlyWithholding } from '@/lib/payroll/withholding';
import { yearEndAdjustment } from '@/lib/payroll/yearEnd';
import { cn } from '@/lib/utils/cn';
import { useAmounts } from './useAmounts';
import { AmountField, ResetButton } from './widgetParts';

/** 小数もそのまま読む（料率・時間） */
const num = (s: string) => Number(s.normalize('NFKC').replace(/[,%％\s円]/g, ''));

/** 源泉所得税を電算機計算の特例で計算して、入力欄に入れる */
function WithholdingHelper({ base, onUse }: { base: number; onUse: (tax: number) => void }) {
  const [year, setYear] = useState(LATEST_TAX_YEAR);
  const [dependents, setDependents] = useState('0');
  const n = Math.max(0, Math.floor(num(dependents)) || 0);
  const w = monthlyWithholding(base, n, year);
  const note = rulesFor(year).monthly.note;
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
      <p className="font-semibold text-slate-700 dark:text-slate-200">
        電算機計算の特例で源泉所得税を計算する（甲欄）
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {TAX_YEARS.map((t) => (
          <button
            key={t.year}
            type="button"
            aria-pressed={year === t.year}
            onClick={() => setYear(t.year)}
            className={cn(
              'rounded-full border px-2.5 py-1 font-medium',
              year === t.year
                ? 'border-accent-600 bg-accent-600 text-white'
                : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
            )}
          >
            {t.year} 年分
          </button>
        ))}
        <label className="flex items-center gap-1">
          扶養親族等
          <input
            inputMode="numeric"
            value={dependents}
            onChange={(e) => setDependents(e.target.value)}
            className="h-8 w-12 rounded-lg border border-slate-300 bg-white px-2 text-right font-mono dark:border-slate-700 dark:bg-slate-900"
          />
          人
        </label>
      </div>
      <p className="leading-relaxed">
        {formatAmount(base)} − 給与所得控除 {formatAmount(w.employmentDeduction)} − 基礎控除{' '}
        {formatAmount(w.basicDeduction)}
        {w.dependentDeduction
          ? ` − 扶養控除など ${formatAmount(w.dependentDeduction)}`
          : ''} ＝ {formatAmount(w.taxable)} → 税額{' '}
        <strong className="font-mono">{formatAmount(w.tax)}</strong> 円
      </p>
      <button
        type="button"
        onClick={() => onUse(w.tax)}
        className="rounded-lg border border-accent-300 px-2.5 py-1 font-medium text-accent-800 hover:bg-accent-50 dark:border-accent-700 dark:text-accent-200 dark:hover:bg-accent-900/30"
      >
        この額を源泉所得税に入れる
      </button>
      <p className="leading-relaxed text-slate-500">
        税額表を引いた額と数円〜数十円違うことがあります（会社でどちらかに決めて続けます）。
        {note ? ` ${note}。` : ''}
      </p>
    </div>
  );
}

/** 1 か月分の給与計算（支給 → 控除 → 差引支給額 → 仕訳） */
export function MonthlyPayrollWidget({ w }: { w: Extract<Widget, { type: 'payroll-month' }> }) {
  const { type: _t, ...init } = w;
  const { values, set, reset } = useAmounts(init);
  const r = useMemo(
    () =>
      monthlyPay({
        basePay: num(values.basePay),
        allowances: num(values.allowances),
        commute: num(values.commute),
        monthlyHours: num(values.monthlyHours),
        overtimeHours: num(values.overtimeHours),
        overtimeRate: num(values.overtimeRate),
        standardMonthly: num(values.standardMonthly),
        healthRate: num(values.healthRate),
        careRate: num(values.careRate),
        pensionRate: num(values.pensionRate),
        employmentRate: num(values.employmentRate),
        incomeTax: num(values.incomeTax),
        residentTax: num(values.residentTax),
      }),
    [values],
  );
  const row = (label: string, v: number, minus?: boolean) => (
    <li key={label} className="flex gap-2">
      <span className="flex-1">{label}</span>
      <span className="font-mono tabular-nums">
        {minus && v ? '△' : ''}
        {formatAmount(v)}
      </span>
    </li>
  );
  return (
    <>
      <p className="text-xs font-semibold text-slate-500">支給</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AmountField label="基本給" value={values.basePay} onChange={set('basePay')} />
        <AmountField
          label="手当（割増の計算に入れる）"
          value={values.allowances}
          onChange={set('allowances')}
        />
        <AmountField label="通勤手当（非課税）" value={values.commute} onChange={set('commute')} />
        <AmountField
          label="月平均所定労働時間"
          value={values.monthlyHours}
          onChange={set('monthlyHours')}
        />
        <AmountField
          label="時間外労働（時間）"
          value={values.overtimeHours}
          onChange={set('overtimeHours')}
        />
        <AmountField
          label="割増率（%）"
          value={values.overtimeRate}
          onChange={set('overtimeRate')}
        />
      </div>
      <p className="text-xs font-semibold text-slate-500">控除（料率は加入先・年度の値を入れる）</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AmountField
          label="標準報酬月額"
          value={values.standardMonthly}
          onChange={set('standardMonthly')}
        />
        <AmountField
          label="健康保険料率（%・合計）"
          value={values.healthRate}
          onChange={set('healthRate')}
        />
        <AmountField
          label="介護保険料率（%・合計）"
          value={values.careRate}
          onChange={set('careRate')}
        />
        <AmountField
          label="厚生年金保険料率（%・合計）"
          value={values.pensionRate}
          onChange={set('pensionRate')}
        />
        <AmountField
          label="雇用保険料率（%・本人）"
          value={values.employmentRate}
          onChange={set('employmentRate')}
        />
        <AmountField
          label="源泉所得税（税額表）"
          value={values.incomeTax}
          onChange={set('incomeTax')}
        />
        <AmountField
          label="住民税（特別徴収）"
          value={values.residentTax}
          onChange={set('residentTax')}
        />
      </div>
      {r.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{r.error}</p>
      ) : (
        <div className="space-y-3 text-sm">
          <ul className="space-y-1 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            {row(
              `時間外手当（1 時間 ${r.hourly.toLocaleString('ja-JP', { maximumFractionDigits: 2 })} 円 × ${100 + num(values.overtimeRate)}% × ${values.overtimeHours} 時間）`,
              r.overtimePay,
            )}
            {row('総支給額', r.gross)}
            {row('健康保険料（介護を含む・本人）', r.health, true)}
            {row('厚生年金保険料（本人）', r.pension, true)}
            {row('雇用保険料（本人）', r.employment, true)}
            {row('源泉所得税', num(values.incomeTax), true)}
            {row('住民税', num(values.residentTax), true)}
            <li className="flex gap-2 border-t border-slate-200 pt-1 font-semibold dark:border-slate-700">
              <span className="flex-1">差引支給額（手取り）</span>
              <span className="font-mono tabular-nums">{formatAmount(r.netPay)}</span>
            </li>
          </ul>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            源泉徴収税額表（月額表の甲欄）は、課税の支給額から社会保険料等を引いた{' '}
            <strong className="font-mono">{formatAmount(r.taxBase)}</strong>{' '}
            円と、扶養親族等の数で引きます。
          </p>
          <WithholdingHelper
            base={r.taxBase}
            onUse={(tax) => set('incomeTax')(formatAmount(tax))}
          />
          <JournalTable entry={r.payday} />
          <JournalTable entry={r.accrual} />
          <p className="text-xs leading-relaxed text-slate-500">
            学習用の計算です。会社負担の保険料は本人と同じ額としています（実際は端数の扱いが違うことがあり、子ども・子育て拠出金などの会社だけが負担するものもあります）。雇用保険料は年度更新でまとめて納めます。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}

/** 年末調整（年分を切り替えられる） */
export function YearEndWidget({ w }: { w: Extract<Widget, { type: 'year-end' }> }) {
  const { type: _t, year: initialYear, ...init } = w;
  const { values, set, reset } = useAmounts(init);
  const [year, setYear] = useState(initialYear);
  const r = useMemo(
    () =>
      yearEndAdjustment({
        salary: num(values.salary),
        withheld: num(values.withheld),
        socialInsurance: num(values.socialInsurance),
        insurance: num(values.insurance),
        spouse: num(values.spouse),
        dependents: num(values.dependents),
        specificDependents: num(values.specificDependents),
        elderlyDependents: num(values.elderlyDependents),
        housingLoan: num(values.housingLoan),
        year,
      }),
    [values, year],
  );
  const valid = Object.values(values).every(
    (v) => Number.isFinite(num(v as string)) && num(v as string) >= 0,
  );
  const refund = r.difference > 0;
  return (
    <>
      <div className="space-y-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="年分">
          {TAX_YEARS.map((t) => (
            <button
              key={t.year}
              type="button"
              aria-pressed={year === t.year}
              onClick={() => setYear(t.year)}
              className={cn(
                'rounded-full border px-2.5 py-1 font-medium',
                year === t.year
                  ? 'border-amber-600 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-600'
                  : 'border-amber-300 bg-white text-amber-900 dark:border-amber-800 dark:bg-transparent dark:text-amber-200',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p>
          {r.rules.label} のルールで計算します（{r.rules.basis}）。主な変更点:
        </p>
        <ul className="list-disc space-y-0.5 pl-4">
          {r.rules.changes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AmountField label="給与・賞与の総額" value={values.salary} onChange={set('salary')} />
        <AmountField
          label="源泉徴収した税額の合計"
          value={values.withheld}
          onChange={set('withheld')}
        />
        <AmountField
          label="社会保険料控除"
          value={values.socialInsurance}
          onChange={set('socialInsurance')}
        />
        <AmountField
          label="生命・地震保険料控除"
          value={values.insurance}
          onChange={set('insurance')}
        />
        <AmountField label="配偶者（特別）控除" value={values.spouse} onChange={set('spouse')} />
        <AmountField
          label="一般の扶養親族（人）"
          value={values.dependents}
          onChange={set('dependents')}
        />
        <AmountField
          label="特定扶養親族（人）"
          value={values.specificDependents}
          onChange={set('specificDependents')}
        />
        <AmountField
          label="老人扶養親族（人）"
          value={values.elderlyDependents}
          onChange={set('elderlyDependents')}
        />
        <AmountField
          label="住宅ローン控除"
          value={values.housingLoan}
          onChange={set('housingLoan')}
        />
      </div>
      {!valid ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">数値を 0 以上で入れてください</p>
      ) : (
        <div className="space-y-2 text-sm">
          <ol className="list-decimal space-y-1 pl-5 leading-relaxed">
            <li>
              給与所得（給与所得控除後）:{' '}
              <span className="font-mono">{formatAmount(r.employmentIncome)}</span>
            </li>
            <li>
              所得控除の合計 <span className="font-mono">{formatAmount(r.deductionTotal)}</span>（
              {r.deductions
                .filter((d) => d.amount)
                .map((d) => `${d.label} ${formatAmount(d.amount)}`)
                .join('、')}
              ）
            </li>
            <li>
              課税給与所得金額（1,000 円未満切り捨て）:{' '}
              <span className="font-mono">{formatAmount(r.taxable)}</span>
            </li>
            <li>
              算出所得税額（速算表）:{' '}
              <span className="font-mono">{formatAmount(r.computedTax)}</span>
            </li>
            <li>
              年調年税額（住宅ローン控除の後 × 102.1%、100 円未満切り捨て）:{' '}
              <strong className="font-mono">{formatAmount(r.annualTax)}</strong>
            </li>
          </ol>
          <p
            className={cn(
              'rounded-xl px-3 py-2 font-medium',
              refund
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                : 'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
            )}
          >
            {r.difference === 0
              ? '過不足なし'
              : refund
                ? `${formatAmount(r.difference)} 円を本人に還付する（源泉徴収しすぎた分）`
                : `${formatAmount(-r.difference)} 円が不足 → 12 月の給料などから追加で差し引く`}
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            給与のほかに所得がない人として、基礎控除を給与所得から決めています。扶養控除は一般 38
            万円・特定 63 万円・老人 48 万円（同居老親等は 58
            万円）で、配偶者控除・生命保険料控除などは申告書で計算した額を入れます。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}
