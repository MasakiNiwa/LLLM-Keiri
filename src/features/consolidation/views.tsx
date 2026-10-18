import { useState } from 'react';
import { CheckCircle2, ChevronDown, PenLine, RotateCcw, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/Progress';
import { Badge } from './Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { JournalTable } from '@/features/journal/JournalTable';
import { ShiwakeExercise, type ExerciseOutcome } from '@/features/journal/ShiwakeExercise';

export type PracticeResult = 'ok' | 'ng';

/** 練習モードの状態（タブを移っても残るよう、ページが持つ） */
export interface PracticeState {
  round: number;
  results: Record<string, PracticeResult>;
}
import { StatementSide } from '@/features/ledger/views';
import {
  NCI_PROFIT_ACCOUNT,
  type ConsolidationResult,
  type EntityResult,
} from '@/lib/consolidation/consolidate';
import {
  ELIMINATION_CATEGORIES,
  type ConsolidationCase,
  type Elimination,
} from '@/lib/content/schema';
import { formatAmount } from '@/lib/journal/amount';
import { parseShiwake } from '@/lib/journal/parse';
import { cn } from '@/lib/utils/cn';
import { RATE_LABELS, signed } from './format';

const mono = 'font-mono tabular-nums';
const drillable =
  'rounded-md text-left underline decoration-slate-300 decoration-dotted underline-offset-4 hover:bg-accent-50 hover:text-accent-800 dark:decoration-slate-600 dark:hover:bg-accent-900/30 dark:hover:text-accent-200';

// ---------------- 各社の試算表 ----------------

function EntityCard({ r, onAccount }: { r: EntityResult; onAccount: (a: string) => void }) {
  const e = r.entity;
  const foreign = e.currency !== 'JPY';
  return (
    <Card className="overflow-hidden">
      <div className="space-y-1 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{e.name}</h3>
          <Badge>{e.role === 'parent' ? '親会社' : `子会社・持分 ${e.ownership}%`}</Badge>
          {foreign && (
            <Badge tone="violet">
              {e.currency}（{e.unit}）
            </Badge>
          )}
        </div>
        {e.note && <p className="text-sm text-slate-600 dark:text-slate-400">{e.note}</p>}
        {foreign && e.rates && (
          <p className="text-xs text-slate-500">
            1 {e.currency} ＝ 取得時 {e.rates.HR} 円・期中平均 {e.rates.AR} 円・決算日 {e.rates.CR}{' '}
            円
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60">
            <tr>
              <th className="px-3 py-1.5 text-left font-medium">勘定科目</th>
              {foreign && <th className="px-3 py-1.5 text-right font-medium">{e.currency}</th>}
              {foreign && <th className="px-3 py-1.5 text-right font-medium">レート</th>}
              <th className="px-3 py-1.5 text-right font-medium">円</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {r.lines.map((l) => (
              <tr key={l.account}>
                <td className="px-3 py-1.5">
                  <button type="button" onClick={() => onAccount(l.account)} className={drillable}>
                    {l.account}
                  </button>
                </td>
                {foreign && (
                  <td className={cn(mono, 'px-3 py-1.5 text-right')}>{signed(l.local)}</td>
                )}
                {foreign && (
                  <td
                    className="px-3 py-1.5 text-right text-xs text-slate-500"
                    title={RATE_LABELS[l.rateType]}
                  >
                    {l.rateType === 'HIST' ? '発生時' : l.rateType} {l.rate}
                  </td>
                )}
                <td className={cn(mono, 'px-3 py-1.5 text-right')}>{signed(l.jpy)}</td>
              </tr>
            ))}
            {foreign && (
              <tr className="bg-violet-50/60 dark:bg-violet-950/20">
                <td className="px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => onAccount('為替換算調整勘定')}
                    className={drillable}
                  >
                    為替換算調整勘定
                  </button>
                </td>
                <td className="px-3 py-1.5 text-right text-xs text-slate-500" colSpan={2}>
                  換算の差額
                </td>
                <td className={cn(mono, 'px-3 py-1.5 text-right')}>
                  {signed(r.translationAdjustment)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-xs text-slate-500">
        （ ）は貸方残高。科目を押すと、連結での内訳を表示します。
      </p>
    </Card>
  );
}

export function EntitiesView({
  result,
  onAccount,
}: {
  result: ConsolidationResult;
  onAccount: (a: string) => void;
}) {
  return (
    <div className="space-y-3">
      {result.entities.map((r) => (
        <EntityCard key={r.entity.id} r={r} onAccount={onAccount} />
      ))}
    </div>
  );
}

// ---------------- 連結修正仕訳 ----------------

function EliminationCard({
  el,
  enabled,
  onToggle,
  onAccount,
  practice,
  result,
  onJudged,
}: {
  el: Elimination;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  onAccount: (a: string) => void;
  /** 練習モード（答えを隠して解く。反映の切り替えは出さない） */
  practice?: boolean;
  result?: PracticeResult;
  onJudged?: (outcome: ExerciseOutcome) => void;
}) {
  const [modeState, setMode] = useState<'show' | 'solve'>('show');
  const mode = practice ? 'solve' : modeState;
  const [open, setOpen] = useState(false);
  const entry = parseShiwake(el.shiwake).entries[0];
  return (
    <Card className={cn('overflow-hidden transition-opacity', !enabled && 'opacity-60')}>
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <Badge>{ELIMINATION_CATEGORIES[el.category]}</Badge>
          <h3 className="mt-1 font-semibold">{el.title}</h3>
        </div>
        {practice ? (
          result && (
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 text-xs font-medium',
                result === 'ok'
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-300',
              )}
            >
              {result === 'ok' ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <XCircle className="size-4" />
              )}
              {result === 'ok' ? '一発正解' : 'やり直し'}
            </span>
          )
        ) : (
          <label className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
            反映
            <Switch
              checked={enabled}
              onChange={onToggle}
              label={`「${el.title}」を連結に反映する`}
            />
          </label>
        )}
      </div>
      <div className="space-y-3 px-4 pb-4">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{el.question}</p>
        {mode === 'show' ? (
          <>
            {entry && <JournalTable entry={entry} onAccountClick={onAccount} />}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              className="inline-flex items-center gap-1 text-sm text-accent-700 dark:text-accent-300"
            >
              <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
              考え方
            </button>
            {open && <p className="text-sm leading-relaxed">{el.explanation}</p>}
            <div>
              <Button size="sm" onClick={() => setMode('solve')}>
                <PenLine />
                答えを隠して自分で解く
              </Button>
            </div>
          </>
        ) : (
          <>
            <ShiwakeExercise
              question={{ question: el.question, answer: el.shiwake, explanation: el.explanation }}
              seed={el.id}
              onJudged={onJudged}
            />
            {!practice && (
              <Button size="sm" variant="ghost" onClick={() => setMode('show')}>
                答えの表示に戻る
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

export function EliminationsView({
  c,
  enabled,
  setEnabled,
  onAccount,
  practice,
  setPractice,
}: {
  c: ConsolidationCase;
  enabled: Set<string>;
  setEnabled: (s: Set<string>) => void;
  onAccount: (a: string) => void;
  practice: PracticeState | null;
  setPractice: (p: PracticeState | null) => void;
}) {
  // 練習モード: 修正仕訳を全部自分で入れる。正解した修正から連結に反映していく
  const all = () => new Set(c.eliminations.map((e) => e.id));
  const start = () => {
    setPractice({ round: (practice?.round ?? 0) + 1, results: {} });
    setEnabled(new Set());
  };
  const stop = () => {
    setPractice(null);
    setEnabled(all());
  };
  const judged = (id: string, o: ExerciseOutcome) => {
    if (!practice) return;
    const prev = practice.results[id];
    // 最初の答え合わせで、答えを見ずに正解したかを記録する（あとで正解しても「やり直し」のまま）
    const first: PracticeResult = prev ?? (o.result.correct && !o.revealed ? 'ok' : 'ng');
    setPractice({ ...practice, results: { ...practice.results, [id]: first } });
    if (o.result.correct) setEnabled(new Set([...enabled, id]));
  };
  const done = practice ? c.eliminations.filter((e) => enabled.has(e.id)).length : 0;
  const firstOk = practice ? Object.values(practice.results).filter((r) => r === 'ok').length : 0;
  const total = c.eliminations.length;
  return (
    <div className="space-y-3">
      {practice ? (
        <Card className="space-y-2 border-accent-300 p-4 dark:border-accent-700">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 font-semibold">
              練習モード: 正解 {done} / {total}
              <span className="ml-2 text-sm font-normal text-slate-500">
                （一発正解 {firstOk}）
              </span>
            </p>
            <Button size="sm" onClick={start}>
              <RotateCcw />
              やり直す
            </Button>
            <Button size="sm" variant="ghost" onClick={stop}>
              練習をやめる
            </Button>
          </div>
          <Progress value={done / total} className="h-1.5" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {done === total
              ? '🎉 すべての修正仕訳を入れました。精算表と連結財務諸表を見て、できあがりを確かめましょう。'
              : '問題文の数字から連結修正仕訳を入れてください。正解した修正から、精算表と連結財務諸表に反映されます。'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-400">
            「反映」を切り替えると、精算表と連結財務諸表がその場で変わります。外すと何が変わるか、見比べてみましょう。
          </p>
          <Button size="sm" variant="primary" onClick={start}>
            <PenLine />
            全部自分で解く
          </Button>
          <Button size="sm" onClick={() => setEnabled(all())}>
            すべて反映
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEnabled(new Set())}>
            すべて外す
          </Button>
        </div>
      )}
      {c.eliminations.map((el) => (
        <EliminationCard
          key={`${el.id}:${practice?.round ?? 0}`}
          el={el}
          enabled={enabled.has(el.id)}
          onToggle={(on) => {
            const next = new Set(enabled);
            if (on) next.add(el.id);
            else next.delete(el.id);
            setEnabled(next);
          }}
          onAccount={onAccount}
          practice={!!practice}
          result={practice?.results[el.id]}
          onJudged={(o) => judged(el.id, o)}
        />
      ))}
    </div>
  );
}

// ---------------- 連結精算表 ----------------

export function WorksheetView({
  c,
  result,
  onAccount,
}: {
  c: ConsolidationCase;
  result: ConsolidationResult;
  onAccount: (a: string) => void;
}) {
  const sum = (f: (r: (typeof result.rows)[number]) => number) =>
    result.rows.reduce((s, r) => s + f(r), 0);
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60">
            <tr>
              <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-medium dark:bg-slate-800">
                勘定科目
              </th>
              {c.entities.map((e) => (
                <th key={e.id} className="px-3 py-2 text-right font-medium">
                  {e.name.replace(/（.*）/, '')}
                  {e.currency !== 'JPY' && <span className="block text-[0.65rem]">円換算後</span>}
                </th>
              ))}
              <th className="px-3 py-2 text-right font-medium">合算</th>
              <th className="px-3 py-2 text-right font-medium">連結修正</th>
              <th className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-slate-200">
                連結
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {result.rows.map((r) => {
              const adj = r.consolidated - r.combined;
              return (
                <tr key={r.account}>
                  <td className="sticky left-0 bg-white px-3 py-1.5 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => onAccount(r.account)}
                      className={drillable}
                    >
                      {r.account}
                    </button>
                  </td>
                  {c.entities.map((e) => (
                    <td key={e.id} className={cn(mono, 'px-3 py-1.5 text-right')}>
                      {signed(r.byEntity[e.id] ?? 0)}
                    </td>
                  ))}
                  <td className={cn(mono, 'px-3 py-1.5 text-right text-slate-500')}>
                    {signed(r.combined)}
                  </td>
                  <td
                    className={cn(
                      mono,
                      'px-3 py-1.5 text-right',
                      adj !== 0 &&
                        'bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
                    )}
                  >
                    {signed(adj)}
                  </td>
                  <td className={cn(mono, 'px-3 py-1.5 text-right font-semibold')}>
                    {signed(r.consolidated)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 text-xs text-slate-500 dark:border-slate-600">
            <tr>
              <td className="sticky left-0 bg-white px-3 py-2 dark:bg-slate-900">
                合計（借方 − 貸方）
              </td>
              {c.entities.map((e) => (
                <td key={e.id} className={cn(mono, 'px-3 py-2 text-right')}>
                  {formatAmount(sum((r) => r.byEntity[e.id] ?? 0))}
                </td>
              ))}
              <td className={cn(mono, 'px-3 py-2 text-right')}>
                {formatAmount(sum((r) => r.combined))}
              </td>
              <td className={cn(mono, 'px-3 py-2 text-right')}>
                {formatAmount(sum((r) => r.consolidated - r.combined))}
              </td>
              <td className={cn(mono, 'px-3 py-2 text-right')}>
                {formatAmount(sum((r) => r.consolidated))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="px-4 py-2 text-xs text-slate-500">
        単位: {c.unit}。（ ）は貸方。各列の合計が 0
        なら貸借が一致しています。科目を押すと、会社ごと・修正仕訳ごとの内訳を表示します。
      </p>
    </Card>
  );
}

// ---------------- 連結財務諸表 ----------------

export function ConsolidatedStatementsView({
  c,
  result,
  onAccount,
}: {
  c: ConsolidationCase;
  result: ConsolidationResult;
  onAccount: (a: string) => void;
}) {
  const s = result.statements;
  const expenses = s.expenses.filter((e) => e.account !== NCI_PROFIT_ACCOUNT);
  const net = result.netIncome;
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <h2 className="px-3 pt-3 pb-2 font-semibold">連結貸借対照表</h2>
        <div className="grid border-t border-slate-200 sm:grid-cols-2 sm:divide-x dark:divide-slate-700 dark:border-slate-700">
          <StatementSide
            title="資産の部"
            sections={[{ label: '資産', lines: s.assets }]}
            total={s.totalAssets}
            onAccount={onAccount}
          />
          <StatementSide
            title="負債・純資産の部"
            sections={[
              { label: '負債', lines: s.liabilities },
              {
                label: '純資産',
                lines: s.equity,
                extra: {
                  account: '親会社株主に帰属する当期純利益（当期分）',
                  amount: result.parentNetIncome,
                  contra: false,
                },
              },
            ]}
            total={s.totalLiabilities + s.totalEquity + result.parentNetIncome}
            onAccount={onAccount}
          />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <h2 className="px-3 pt-3 pb-2 font-semibold">連結損益計算書</h2>
        <div className="grid border-t border-slate-200 sm:grid-cols-2 sm:divide-x dark:divide-slate-700 dark:border-slate-700">
          <StatementSide
            title="費用"
            sections={[
              {
                label: '費用',
                lines: expenses,
                extra: net >= 0 ? { account: '当期純利益', amount: net, contra: false } : undefined,
              },
            ]}
            total={s.totalExpenses - result.nciProfit + Math.max(0, net)}
            onAccount={onAccount}
          />
          <StatementSide
            title="収益"
            sections={[
              {
                label: '収益',
                lines: s.revenues,
                extra: net < 0 ? { account: '当期純損失', amount: -net, contra: false } : undefined,
              },
            ]}
            total={s.totalRevenues + Math.max(0, -net)}
            onAccount={onAccount}
          />
        </div>
        <div className="space-y-1 border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
          {[
            ['当期純利益', net],
            ['非支配株主に帰属する当期純利益', result.nciProfit],
            ['親会社株主に帰属する当期純利益', result.parentNetIncome],
          ].map(([label, v], i) => (
            <div
              key={label}
              className={cn(
                'flex gap-2',
                i === 2 && 'border-t border-slate-200 pt-1 font-semibold dark:border-slate-700',
              )}
            >
              {i === 1 ? (
                <button
                  type="button"
                  onClick={() => onAccount(NCI_PROFIT_ACCOUNT)}
                  className={cn('min-w-0 flex-1 pl-3', drillable)}
                >
                  {label}
                </button>
              ) : (
                <span className="min-w-0 flex-1">{label}</span>
              )}
              <span className={mono}>
                {i === 1 && (v as number) !== 0
                  ? `△${formatAmount(v as number)}`
                  : formatAmount(v as number)}
              </span>
            </div>
          ))}
        </div>
      </Card>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        単位: {c.unit}
        。学習用の簡単な勘定式です。金額を押すと、会社ごと・修正仕訳ごとの内訳（ドリルダウン）を表示します。
      </p>
    </div>
  );
}
