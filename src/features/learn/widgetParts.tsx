import { RotateCcw } from 'lucide-react';
import { formatAmount, parseAmount } from '@/lib/journal/amount';

/** 金額の入力（カンマ・「万」も読める） */
export function AmountField({
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

export function ResetButton({ onClick }: { onClick: () => void }) {
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
