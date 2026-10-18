import { ChevronRight, Info } from 'lucide-react';
import { DrillSheet } from '@/components/ui/DrillSheet';
import { useAccountSheet } from '@/features/accounts/accountSheetStore';
import { JournalTable } from '@/features/journal/JournalTable';
import { translationGroups, type ConsolidationResult } from '@/lib/consolidation/consolidate';
import { useContent } from '@/features/content/contentStore';
import { ELIMINATION_CATEGORIES, type ConsolidationCase } from '@/lib/content/schema';
import { formatAmount } from '@/lib/journal/amount';
import { parseShiwake } from '@/lib/journal/parse';
import { cn } from '@/lib/utils/cn';
import { Badge } from './Badge';
import { RATE_LABELS, signed } from './format';

export type ConsolidationDrillItem =
  { kind: 'account'; account: string } | { kind: 'elimination'; id: string };

const mono = 'font-mono tabular-nums';

function itemLabel(item: ConsolidationDrillItem, c: ConsolidationCase): string {
  return item.kind === 'account'
    ? item.account
    : (c.eliminations.find((e) => e.id === item.id)?.title ?? '修正仕訳');
}

/**
 * 連結のドリルダウン: 連結の金額 → 会社ごとの金額（在外子会社は換算の計算）と修正仕訳ごとの金額 → 修正仕訳 → その科目 …
 */
export function ConsolidationDrill({
  c,
  result,
  enabled,
  stack,
  onPush,
  onBack,
  onClose,
}: {
  c: ConsolidationCase;
  result: ConsolidationResult;
  enabled: Set<string>;
  stack: ConsolidationDrillItem[];
  onPush: (item: ConsolidationDrillItem) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const top = stack.at(-1);
  const openInfo = useAccountSheet((s) => s.open);
  const book = useContent((s) => s.book);
  const row =
    top?.kind === 'account' ? result.rows.find((r) => r.account === top.account) : undefined;
  const el = top?.kind === 'elimination' ? c.eliminations.find((e) => e.id === top.id) : undefined;
  return (
    <DrillSheet
      open={!!top}
      title={top ? itemLabel(top, c) : ''}
      description={
        top?.kind === 'account'
          ? `連結の金額の内訳（単位: ${c.unit}・（ ）は貸方）`
          : '連結修正仕訳。科目を押すと、その科目の内訳を表示します'
      }
      trail={stack.map((s) => itemLabel(s, c))}
      onBack={onBack}
      onClose={onClose}
    >
      {top?.kind === 'account' &&
        (row ? (
          <div className="space-y-3 text-sm">
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {result.entities.map((r) => {
                const line = r.lines.find((l) => l.account === row.account);
                const isAdj = row.account === '為替換算調整勘定' && r.translationAdjustment !== 0;
                return (
                  <div key={r.entity.id} className="flex items-start gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div>{r.entity.name}</div>
                      {line && line.rateType !== 'JPY' && (
                        <div className="text-xs text-slate-500">
                          {signed(line.local)} {r.entity.currency} × {line.rate}（
                          {RATE_LABELS[line.rateType]}）
                        </div>
                      )}
                      {isAdj && (
                        <div className="text-xs text-slate-500">
                          換算で生じた差額（貸借を合わせる）
                        </div>
                      )}
                    </div>
                    <span className={mono}>{signed(row.byEntity[r.entity.id] ?? 0)}</span>
                  </div>
                );
              })}
              <div className="flex gap-2 bg-slate-50 px-3 py-2 text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                <span className="flex-1">合算</span>
                <span className={mono}>{signed(row.combined)}</span>
              </div>
              {c.eliminations
                .filter((e) => row.byElimination[e.id] !== undefined)
                .map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onPush({ kind: 'elimination', id: e.id })}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent-50 dark:hover:bg-accent-900/30"
                  >
                    <span className="min-w-0 flex-1">
                      {ELIMINATION_CATEGORIES[e.category] !== e.title && (
                        <span className="block text-xs text-slate-500">
                          {ELIMINATION_CATEGORIES[e.category]}
                        </span>
                      )}
                      <span className="underline decoration-dotted underline-offset-4">
                        {e.title}
                      </span>
                    </span>
                    <span className={cn(mono, 'text-amber-700 dark:text-amber-300')}>
                      {signed(row.byElimination[e.id])}
                    </span>
                    <ChevronRight className="size-4 text-slate-400" />
                  </button>
                ))}
              <div className="flex gap-2 px-3 py-2 font-semibold">
                <span className="flex-1">連結</span>
                <span className={mono}>{signed(row.consolidated)}</span>
              </div>
            </div>
            {row.account === '為替換算調整勘定' &&
              book &&
              result.entities
                .filter((r) => r.translationAdjustment !== 0)
                .map((r) => (
                  <div
                    key={r.entity.id}
                    className="rounded-xl bg-violet-50/60 p-3 dark:bg-violet-950/20"
                  >
                    <p className="mb-2 font-medium">{r.entity.name}の換算の差額はどこから来たか</p>
                    <table className="w-full text-xs">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="py-1 text-left font-medium">項目</th>
                          <th className="py-1 text-right font-medium">{r.entity.currency}</th>
                          <th className="py-1 text-right font-medium">レート</th>
                          <th className="py-1 text-right font-medium">円</th>
                        </tr>
                      </thead>
                      <tbody>
                        {translationGroups(r, book).map((g) => (
                          <tr key={g.label + g.rate}>
                            <td className="py-1">{g.label}</td>
                            <td className={cn(mono, 'py-1 text-right')}>{signed(g.local)}</td>
                            <td className="py-1 text-right">
                              {g.rateType === 'HIST' ? '発生時' : g.rateType} {g.rate}
                            </td>
                            <td className={cn(mono, 'py-1 text-right')}>{signed(g.jpy)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-violet-200 font-semibold dark:border-violet-900">
                          <td className="py-1" colSpan={3}>
                            合計（貸借が合わない分）
                          </td>
                          <td className={cn(mono, 'py-1 text-right')}>
                            {signed(-r.translationAdjustment)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      現地通貨では貸借が一致していても、項目ごとに違うレートで換算すると円では一致しません。その差（
                      {signed(-r.translationAdjustment)}）を打ち消すのが為替換算調整勘定（
                      {signed(r.translationAdjustment)}）です。
                    </p>
                  </div>
                ))}
            {c.eliminations.some((e) => !enabled.has(e.id)) && (
              <p className="text-xs text-slate-500">
                ※ いま「反映」を外している修正仕訳は含めていません。
              </p>
            )}
            <button
              type="button"
              onClick={() => openInfo(row.account)}
              className="inline-flex items-center gap-1 text-accent-700 hover:underline dark:text-accent-300"
            >
              <Info className="size-4" />「{row.account}」の説明
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">この科目の金額はありません</p>
        ))}
      {top?.kind === 'elimination' && el && (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge>{ELIMINATION_CATEGORIES[el.category]}</Badge>
            {!enabled.has(el.id) && <Badge tone="violet">いまは反映していません</Badge>}
          </div>
          <p className="leading-relaxed">{el.question}</p>
          <JournalTable
            entry={parseShiwake(el.shiwake).entries[0] ?? { lines: [] }}
            onAccountClick={(account) => onPush({ kind: 'account', account })}
          />
          <p className="leading-relaxed text-slate-700 dark:text-slate-300">{el.explanation}</p>
          <p className="text-xs text-slate-500">
            金額の単位: {c.unit}（{formatAmount(1)} ＝ 1 {c.unit}）
          </p>
        </div>
      )}
    </DrillSheet>
  );
}
