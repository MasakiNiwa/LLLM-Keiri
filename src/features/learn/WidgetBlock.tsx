import { useMemo, useState } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { JournalTable } from '@/features/journal/JournalTable';
import { WidgetSchema, type Widget } from '@/lib/content/schema';
import { formatAmount, parseAmount } from '@/lib/journal/amount';
import {
  collectionEntry,
  payrollEntries,
  SHORTFALL_REASONS,
  type ShortfallReason,
} from '@/lib/practice/entries';

/** 金額の入力（カンマ・「万」も読める） */
function AmountField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-slate-600 dark:text-slate-400">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const n = parseAmount(value);
          if (n !== null) onChange(formatAmount(n));
        }}
        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-right font-mono tabular-nums dark:border-slate-700 dark:bg-slate-900"
      />
    </label>
  );
}

const amount = (s: string) => parseAmount(s) ?? NaN;

function useAmounts<K extends string>(initial: Record<K, number>) {
  const toText = () =>
    Object.fromEntries(
      Object.entries(initial).map(([k, v]) => [k, formatAmount(v as number)]),
    ) as Record<K, string>;
  const [values, setValues] = useState(toText);
  return {
    values,
    set: (k: K) => (v: string) => setValues((s) => ({ ...s, [k]: v })),
    reset: () => setValues(toText()),
  };
}

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

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
    >
      <RotateCcw className="size-3.5" />
      最初の数字に戻す
    </button>
  );
}

const TITLES: Record<Widget['type'], string> = {
  payroll: '給料の仕訳を作ってみる',
  collection: '入金消込の仕訳を作ってみる',
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
        数字を変えると、仕訳が作り直されます。
      </p>
      {w.type === 'payroll' ? <PayrollWidget w={w} /> : <CollectionWidget w={w} />}
    </section>
  );
}
