import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import {
  RATIO_CATEGORIES,
  ratioText,
  type Ratio,
  type RatioCategory,
  type RatioTerm,
} from '@/lib/analysis/ratios';
import { formatAmount } from '@/lib/journal/amount';
import { cn } from '@/lib/utils/cn';

const mono = 'font-mono tabular-nums';
const yen = (n: number) => (n < 0 ? `△${formatAmount(-n)}` : formatAmount(n));

function TermBox({ t, onAccount }: { t: RatioTerm; onAccount?: (account: string) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700">
      <div className="flex gap-2 bg-slate-50 px-3 py-1.5 text-sm font-medium dark:bg-slate-800/50">
        <span className="flex-1">{t.label}</span>
        <span className={mono}>{yen(t.value)}</span>
      </div>
      <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
        {t.parts.map((p) => (
          <li key={p.account} className="flex gap-2 px-3 py-1.5">
            {onAccount && !p.account.includes('（') ? (
              <button
                type="button"
                onClick={() => onAccount(p.account)}
                className="min-w-0 flex-1 text-left underline decoration-slate-300 decoration-dotted underline-offset-4 hover:text-accent-700 dark:decoration-slate-600 dark:hover:text-accent-300"
              >
                {p.account}
              </button>
            ) : (
              <span className="min-w-0 flex-1">{p.account}</span>
            )}
            <span className={cn(mono, p.amount < 0 && 'text-rose-600 dark:text-rose-400')}>
              {yen(p.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 財務諸表の分析。比率はプログラムが計算し、押すと分子・分母の内訳（科目）が開く。
 * 科目を押すと、元帳・連結の内訳へドリルダウンできる。
 */
export function AnalysisView({
  ratios,
  unit,
  onAccount,
  note,
}: {
  ratios: Ratio[];
  unit?: string;
  onAccount?: (account: string) => void;
  note?: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const categories = Object.keys(RATIO_CATEGORIES) as RatioCategory[];
  return (
    <div className="space-y-4">
      {categories.map((cat) => (
        <Card key={cat} className="overflow-hidden">
          <h2 className="px-4 pt-3 pb-2 font-semibold">{RATIO_CATEGORIES[cat]}</h2>
          <ul className="border-t border-slate-200 dark:border-slate-700">
            {ratios
              .filter((r) => r.category === cat)
              .map((r) => (
                <li
                  key={r.id}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <button
                    type="button"
                    onClick={() => setOpen(open === r.id ? null : r.id)}
                    aria-expanded={open === r.id}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <ChevronDown
                      className={cn(
                        'size-4 shrink-0 text-slate-400 transition-transform',
                        open === r.id && 'rotate-180',
                      )}
                    />
                    <span className="min-w-0 flex-1 text-sm">{r.label}</span>
                    <span className={cn(mono, 'text-base font-semibold')}>{ratioText(r)}</span>
                  </button>
                  {open === r.id && (
                    <div className="space-y-3 px-4 pb-4 text-sm">
                      <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                        {r.explanation}
                      </p>
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50">
                        {r.formula} ＝ {yen(r.numerator.value)} ÷ {yen(r.denominator.value)}
                        {r.unit === '%' ? ' × 100' : ''} ＝ {ratioText(r)}
                        {r.value === null && '（分母が 0 以下なので計算しません）'}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TermBox t={r.numerator} onAccount={onAccount} />
                        <TermBox t={r.denominator} onAccount={onAccount} />
                      </div>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </Card>
      ))}
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {unit ? `単位: ${unit}。` : ''}
        比率はプログラムが計算しています（% は小数第 1 位、回は小数第 2
        位で四捨五入）。学習用に、期首と期末の平均ではなく期末の残高を使っています。
        比率を押すと計算式と内訳が開き、科目を押すと内訳へたどれます。比率の良し悪しは業種や会社の状況で変わるので、前の年や同業の会社と比べて読みます。
        {note}
      </p>
    </div>
  );
}
