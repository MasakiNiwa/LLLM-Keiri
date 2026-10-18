import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { JournalTable } from '@/features/journal/JournalTable';
import { WidgetSchema, type Widget } from '@/lib/content/schema';
import { formatAmount } from '@/lib/journal/amount';
import { amount, useAmounts } from './useAmounts';
import { AmountField, ResetButton } from './widgetParts';
import { ImpairmentWidget, LeaseWidget, PointsWidget } from './StandardsWidgets';
import { DeficiencyWidget } from './JsoxWidgets';
import { Beppyo4Widget } from './TaxWidgets';
import { MonthlyPayrollWidget } from './PayrollWidgets';
import { CvpWidget, OverheadWidget, ProcessCostingWidget, StandardCostWidget } from './CostWidgets';
import {
  collectionEntry,
  payrollEntries,
  SHORTFALL_REASONS,
  type ShortfallReason,
} from '@/lib/practice/entries';
import { consumptionTaxSettlement, DEEMED_RATES, type BusinessType } from '@/lib/tax/settlement';
import { rewardEntries, WITHHOLDING_THRESHOLD } from '@/lib/tax/withholding';
import { disposalEntry } from '@/lib/assets/disposal';

function PayrollWidget({ w }: { w: Extract<Widget, { type: 'payroll' }> }) {
  const { values, set, reset } = useAmounts({
    gross: w.gross,
    incomeTax: w.incomeTax,
    residentTax: w.residentTax,
    socialInsurance: w.socialInsurance,
  });
  const r = useMemo(
    () =>
      payrollEntries({
        gross: amount(values.gross),
        incomeTax: amount(values.incomeTax),
        residentTax: amount(values.residentTax),
        socialInsurance: amount(values.socialInsurance),
      }),
    [values],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AmountField label="総支給額" value={values.gross} onChange={set('gross')} />
        <AmountField label="源泉所得税" value={values.incomeTax} onChange={set('incomeTax')} />
        <AmountField label="住民税" value={values.residentTax} onChange={set('residentTax')} />
        <AmountField
          label="社会保険料（本人分）"
          value={values.socialInsurance}
          onChange={set('socialInsurance')}
        />
      </div>
      {r.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{r.error}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            手取り額（振り込む額）: <strong className="font-mono">{formatAmount(r.netPay)}</strong>{' '}
            円
          </p>
          <JournalTable entry={r.payday} />
          {r.taxPayment && <JournalTable entry={r.taxPayment} />}
          {r.socialPayment && <JournalTable entry={r.socialPayment} />}
          <p className="text-xs leading-relaxed text-slate-500">
            会社の負担分の社会保険料は、学習用に本人分と同じ額としています（実際は保険の種類ごとに決まります）。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}

function CollectionWidget({ w }: { w: Extract<Widget, { type: 'collection' }> }) {
  const { values, set, reset } = useAmounts({ billed: w.billed, received: w.received });
  const [reason, setReason] = useState<ShortfallReason>('fee-self');
  const billed = amount(values.billed);
  const received = amount(values.received);
  const r = useMemo(
    () => collectionEntry({ billed, received, reason }),
    [billed, received, reason],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField label="請求額（売掛金）" value={values.billed} onChange={set('billed')} />
        <AmountField label="入金額" value={values.received} onChange={set('received')} />
      </div>
      {received < billed && (
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
            入金が少ない理由
          </span>
          <Select
            value={reason}
            onChange={(v) => setReason(v as ShortfallReason)}
            options={Object.entries(SHORTFALL_REASONS).map(([value, label]) => ({ value, label }))}
            className="w-full"
          />
        </label>
      )}
      <p className="text-sm leading-relaxed">{r.message}</p>
      {r.entry && <JournalTable entry={r.entry} />}
      {r.remaining > 0 && (
        <p className="text-sm">
          売掛金の残り: <strong className="font-mono">{formatAmount(r.remaining)}</strong> 円
        </p>
      )}
      <ResetButton
        onClick={() => {
          reset();
          setReason('fee-self');
        }}
      />
    </>
  );
}

function WithholdingWidget({ w }: { w: Extract<Widget, { type: 'withholding' }> }) {
  const { values, set, reset } = useAmounts({ fee: w.fee, consumptionTax: w.consumptionTax });
  const fee = amount(values.fee);
  const tax = amount(values.consumptionTax);
  const valid = Number.isInteger(fee) && fee > 0 && Number.isInteger(tax) && tax >= 0;
  const r = useMemo(
    () => (valid ? rewardEntries({ fee, consumptionTax: tax, account: '支払手数料' }) : null),
    [valid, fee, tax],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField label="報酬（税抜）" value={values.fee} onChange={set('fee')} />
        <AmountField
          label="消費税（請求書に区分）"
          value={values.consumptionTax}
          onChange={set('consumptionTax')}
        />
      </div>
      {r ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            源泉所得税: <strong className="font-mono">{formatAmount(r.tax)}</strong> 円（
            {fee <= WITHHOLDING_THRESHOLD
              ? `${formatAmount(fee)} × 10.21%`
              : `${formatAmount(WITHHOLDING_THRESHOLD)} × 10.21% ＋ ${formatAmount(fee - WITHHOLDING_THRESHOLD)} × 20.42%`}
            、1 円未満切り捨て）／ 振り込む額:{' '}
            <strong className="font-mono">{formatAmount(r.payment)}</strong> 円
          </p>
          <JournalTable entry={r.entry} />
          <JournalTable entry={r.paymentEntry} />
          <p className="text-xs leading-relaxed text-slate-500">
            税理士などへの報酬を想定し、費用の科目は支払手数料としています。原稿料なら支払手数料や雑費など、内容に合わせて選びます。
          </p>
        </div>
      ) : (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          報酬の額を、円の整数で入れてください
        </p>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}

function SettlementWidget({ w }: { w: Extract<Widget, { type: 'tax-settlement' }> }) {
  const { values, set, reset } = useAmounts({ received: w.received, paid: w.paid });
  const [method, setMethod] = useState<'general' | 'simplified'>('general');
  const [businessType, setBusinessType] = useState<BusinessType>(5);
  const received = amount(values.received);
  const paid = amount(values.paid);
  const valid = [received, paid].every((n) => Number.isInteger(n) && n >= 0);
  const r = useMemo(
    () => (valid ? consumptionTaxSettlement({ received, paid, method, businessType }) : null),
    [valid, received, paid, method, businessType],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField label="仮受消費税等" value={values.received} onChange={set('received')} />
        <AmountField label="仮払消費税等" value={values.paid} onChange={set('paid')} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-600 dark:text-slate-400">計算の方法</span>
          <Select
            value={method}
            onChange={(v) => setMethod(v as 'general' | 'simplified')}
            options={[
              { value: 'general', label: '一般課税（原則）' },
              { value: 'simplified', label: '簡易課税' },
            ]}
            className="w-full"
          />
        </label>
        {method === 'simplified' && (
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
              事業の区分
            </span>
            <Select
              value={String(businessType)}
              onChange={(v) => setBusinessType(Number(v) as BusinessType)}
              options={Object.entries(DEEMED_RATES).map(([k, d]) => ({
                value: k,
                label: `${d.label} ${d.rate}%`,
              }))}
              className="w-full"
            />
          </label>
        )}
      </div>
      {r ? (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">
            {method === 'general'
              ? `納付額 ＝ 仮受 ${formatAmount(received)} − 仮払 ${formatAmount(paid)}`
              : `控除額 ＝ 仮受 ${formatAmount(received)} × みなし仕入率 ${DEEMED_RATES[businessType].rate}% ＝ ${formatAmount(r.deductible)}。納付額 ＝ ${formatAmount(received)} − ${formatAmount(r.deductible)}`}
            {' ＝ '}
            <strong className="font-mono">{formatAmount(r.payable)}</strong> 円
            {r.payable < 0 && '（還付）'}
          </p>
          <JournalTable entry={r.entry} />
          {r.difference !== 0 && (
            <p className="text-sm leading-relaxed">
              簡易課税では、実際に払った消費税（仮払）ではなく、みなし仕入率で控除額を決めます。仮受と仮払の差（
              {formatAmount(received - paid)}）と納付額の差 {formatAmount(Math.abs(r.difference))}{' '}
              円は、
              {r.difference > 0 ? '雑益' : '雑損'}にします。
            </p>
          )}
          <p className="text-xs leading-relaxed text-slate-500">
            学習用の簡単な計算です。実際の申告では、課税標準額から国税と地方消費税を順に計算するので、端数で少しずれることがあります。
          </p>
        </div>
      ) : (
        <p className="text-sm text-rose-600 dark:text-rose-400">金額を、円の整数で入れてください</p>
      )}
      <ResetButton
        onClick={() => {
          reset();
          setMethod('general');
          setBusinessType(5);
        }}
      />
    </>
  );
}

function DisposalWidget({ w }: { w: Extract<Widget, { type: 'asset-disposal' }> }) {
  const { values, set, reset } = useAmounts({
    cost: w.cost,
    life: w.life,
    yearsUsed: w.yearsUsed,
    months: w.months,
    price: w.price,
  });
  const r = useMemo(
    () =>
      disposalEntry({
        account: '備品',
        cost: amount(values.cost),
        life: amount(values.life),
        yearsUsed: amount(values.yearsUsed),
        months: amount(values.months),
        price: amount(values.price),
      }),
    [values],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AmountField label="取得原価" value={values.cost} onChange={set('cost')} />
        <AmountField label="耐用年数（年）" value={values.life} onChange={set('life')} />
        <AmountField
          label="期首までの使用年数"
          value={values.yearsUsed}
          onChange={set('yearsUsed')}
        />
        <AmountField label="当期の使用月数" value={values.months} onChange={set('months')} />
        <AmountField label="売却額" value={values.price} onChange={set('price')} />
      </div>
      {r.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{r.error}</p>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-1 text-sm leading-relaxed">
            <li>
              1 年分の減価償却費: {formatAmount(amount(values.cost))} ÷ {values.life} 年 ＝{' '}
              <span className="font-mono">{formatAmount(r.annual)}</span>
            </li>
            <li>
              期首の減価償却累計額: {formatAmount(r.annual)} × {values.yearsUsed} 年 ＝{' '}
              <span className="font-mono">{formatAmount(r.accumulated)}</span>
            </li>
            <li>
              当期の減価償却費（月割り）: {formatAmount(r.annual)} × {values.months} / 12 ＝{' '}
              <span className="font-mono">{formatAmount(r.current)}</span>
            </li>
            <li>
              売却時の帳簿価額: <span className="font-mono">{formatAmount(r.bookValue)}</span> →{' '}
              {r.gain === 0
                ? '売却額と同じ（損益なし）'
                : r.gain > 0
                  ? `売却益 ${formatAmount(r.gain)}`
                  : `売却損 ${formatAmount(-r.gain)}`}
            </li>
          </ul>
          <JournalTable entry={r.entry} />
          <p className="text-xs leading-relaxed text-slate-500">
            定額法・残存価額 0・間接法（減価償却累計額）で、1 円未満は切り捨てています。
          </p>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}

const TITLES: Record<Widget['type'], string> = {
  payroll: '給料の仕訳を作ってみる',
  collection: '入金消込の仕訳を作ってみる',
  withholding: '報酬の源泉徴収を計算してみる',
  'tax-settlement': '決算の消費税の精算をしてみる',
  'asset-disposal': '固定資産の売却を計算してみる',
  points: 'ポイントへの配分を計算してみる',
  impairment: '減損を判定してみる',
  lease: 'リース負債を計算してみる',
  'process-costing': '総合原価計算をしてみる',
  overhead: '製造間接費の差異を分析してみる',
  'standard-cost': '標準原価の差異を分析してみる',
  cvp: '損益分岐点を計算してみる',
  deficiency: '不備の重要性を評価してみる',
  beppyo4: '別表四で所得を計算してみる',
  'payroll-month': '1 か月分の給与を計算してみる',
};

/** レッスンの中の計算の部品（` ```widget `）。仕訳はプログラムが作る */
export function WidgetBlock({ json }: { json: string }) {
  const w = useMemo(() => {
    try {
      const r = WidgetSchema.safeParse(JSON.parse(json));
      return r.success ? r.data : null;
    } catch {
      return null;
    }
  }, [json]);
  if (!w) return null;
  return (
    <section className="my-5 space-y-3 rounded-2xl border border-accent-200 bg-accent-50/40 p-4 dark:border-accent-900 dark:bg-accent-950/20">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-accent-700 dark:text-accent-300">
        <Calculator className="size-4" />
        {TITLES[w.type]}
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        数字を変えると、プログラムがその場で計算し直します。
      </p>
      {w.type === 'payroll' && <PayrollWidget w={w} />}
      {w.type === 'collection' && <CollectionWidget w={w} />}
      {w.type === 'withholding' && <WithholdingWidget w={w} />}
      {w.type === 'tax-settlement' && <SettlementWidget w={w} />}
      {w.type === 'asset-disposal' && <DisposalWidget w={w} />}
      {w.type === 'points' && <PointsWidget w={w} />}
      {w.type === 'impairment' && <ImpairmentWidget w={w} />}
      {w.type === 'lease' && <LeaseWidget w={w} />}
      {w.type === 'process-costing' && <ProcessCostingWidget w={w} />}
      {w.type === 'overhead' && <OverheadWidget w={w} />}
      {w.type === 'standard-cost' && <StandardCostWidget w={w} />}
      {w.type === 'cvp' && <CvpWidget w={w} />}
      {w.type === 'deficiency' && <DeficiencyWidget w={w} />}
      {w.type === 'beppyo4' && <Beppyo4Widget w={w} />}
      {w.type === 'payroll-month' && <MonthlyPayrollWidget w={w} />}
    </section>
  );
}
