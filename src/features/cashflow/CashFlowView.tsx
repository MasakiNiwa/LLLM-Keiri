import { useState } from 'react';
import { CheckCircle2, ChevronDown, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import {
  SECTION_LABELS,
  type CashFlowSection,
  type CashFlowStatement,
} from '@/lib/cashflow/indirect';
import { formatAmount } from '@/lib/journal/amount';
import { cn } from '@/lib/utils/cn';

const mono = 'font-mono tabular-nums';
const yen = (n: number) => (n < 0 ? `△${formatAmount(-n)}` : formatAmount(n));
const SECTIONS: CashFlowSection[] = ['operating', 'investing', 'financing', 'translation'];

/**
 * 間接法のキャッシュ・フロー計算書。行を押すと、その金額の理由が開き、
 * もとの科目から（元帳・連結の内訳へ）ドリルダウンできる。
 */
export function CashFlowView({
  cf,
  unit,
  onAccount,
  note,
}: {
  cf: CashFlowStatement;
  unit?: string;
  onAccount?: (account: string) => void;
  note?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const ok = cf.netChange === cf.closingCash - cf.openingCash;
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <h2 className="px-4 pt-3 pb-2 font-semibold">キャッシュ・フロー計算書（間接法）</h2>
        {SECTIONS.filter((s) => s !== 'translation' || cf.lines.some((l) => l.section === s)).map(
          (section) => (
            <div key={section} className="border-t border-slate-200 dark:border-slate-700">
              <div className="bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800/60">
                {SECTION_LABELS[section]}
              </div>
              <ul className="text-sm">
                {cf.lines.map((l, i) =>
                  l.section !== section ? null : (
                    <li
                      key={i}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                    >
                      <button
                        type="button"
                        onClick={() => setOpen(open === i ? null : i)}
                        aria-expanded={open === i}
                        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-slate-400 transition-transform',
                            open === i && 'rotate-180',
                          )}
                        />
                        <span className="min-w-0 flex-1">{l.label}</span>
                        <span
                          className={cn(mono, l.amount < 0 && 'text-rose-700 dark:text-rose-300')}
                        >
                          {yen(l.amount)}
                        </span>
                      </button>
                      {open === i && (
                        <div className="space-y-1.5 px-4 pb-3 pl-10 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          <p>{l.explanation}</p>
                          {l.account && (
                            <p>
                              {l.account}: 期首 {formatAmount(Math.abs(l.opening ?? 0))} → 期末{' '}
                              {formatAmount(Math.abs(l.closing ?? 0))}
                              {onAccount && (
                                <button
                                  type="button"
                                  onClick={() => onAccount(l.account!)}
                                  className="ml-2 text-accent-700 underline underline-offset-2 dark:text-accent-300"
                                >
                                  「{l.account}」の内訳を見る
                                </button>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  ),
                )}
              </ul>
              <div className="flex border-t border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">
                <span className="flex-1">小計</span>
                <span className={mono}>{yen(cf.totals[section])}</span>
              </div>
            </div>
          ),
        )}
        <div className="space-y-1 border-t-2 border-slate-300 px-4 py-3 text-sm dark:border-slate-600">
          <div className="flex font-semibold">
            <span className="flex-1">現金及び現金同等物の増減額</span>
            <span className={mono}>{yen(cf.netChange)}</span>
          </div>
          <div className="flex text-slate-600 dark:text-slate-400">
            <span className="flex-1">現金及び現金同等物の期首残高</span>
            <span className={mono}>{yen(cf.openingCash)}</span>
          </div>
          <div className="flex font-semibold">
            <span className="flex-1">現金及び現金同等物の期末残高</span>
            <span className={mono}>{yen(cf.closingCash)}</span>
          </div>
        </div>
      </Card>
      <p
        className={cn(
          'flex items-start gap-1.5 text-xs',
          ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300',
        )}
      >
        {ok ? (
          <CheckCircle2 className="size-4 shrink-0" />
        ) : (
          <AlertTriangle className="size-4 shrink-0" />
        )}
        {ok
          ? '3 つの活動の合計が、現金・預金の増減と一致しています'
          : '合計が現金・預金の増減と一致しません（現金過不足などの一時的な科目が残っているかもしれません）'}
      </p>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {unit && `単位: ${unit}。`}
        期首と期末の貸借対照表の増減から、プログラムが作った学習用の簡単なキャッシュ・フロー計算書です（現金及び現金同等物は現金・当座預金・普通預金）。行を押すと、金額の理由が開きます。
        {note && ` ${note}`}
      </p>
    </div>
  );
}
