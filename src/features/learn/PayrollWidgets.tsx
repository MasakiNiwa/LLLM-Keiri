import { useMemo } from 'react';
import { JournalTable } from '@/features/journal/JournalTable';
import type { Widget } from '@/lib/content/schema';
import { formatAmount } from '@/lib/journal/amount';
import { monthlyPay } from '@/lib/payroll/monthly';
import { useAmounts } from './useAmounts';
import { AmountField, ResetButton } from './widgetParts';

/** 小数もそのまま読む（料率・時間） */
const num = (s: string) => Number(s.normalize('NFKC').replace(/[,%％\s円]/g, ''));

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
