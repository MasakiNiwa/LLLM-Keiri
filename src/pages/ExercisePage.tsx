import { Fragment, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, FileSpreadsheet, Landmark, XCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation, useParams } from 'wouter';
import { BackButton } from '@/app/BackButton';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Switch } from '@/components/ui/Switch';
import { Tabs } from '@/components/ui/Tabs';
import { useAccountSheet } from '@/features/accounts/accountSheetStore';
import { useFocus } from '@/features/ai/useFocus';
import { useContent, useContentIndex } from '@/features/content/contentStore';
import { recordAttempt } from '@/features/drill/records';
import { useReviewOnce } from '@/features/drill/reviewRepo';
import { HistoryLink } from '@/features/log/HistoryLink';
import { ShiwakeExercise, type ExerciseOutcome } from '@/features/journal/ShiwakeExercise';
import { BasisInfo } from '@/features/learn/MetaBadges';
import { StatementsView } from '@/features/ledger/views';
import { buildWorksheet, type Worksheet } from '@/lib/closing/worksheet';
import { fetchExercise } from '@/lib/content/load';
import { EXERCISE_LABELS, type ClosingExercise } from '@/lib/content/schema';
import { db } from '@/lib/db/db';
import { formatAmount } from '@/lib/journal/amount';
import { parseShiwake } from '@/lib/journal/parse';
import { buildLedger, buildStatements } from '@/lib/ledger/ledger';
import { cn } from '@/lib/utils/cn';
import { errorMessage } from '@/lib/utils/format';

type Tab = 'adjustments' | 'worksheet' | 'statements';
const tabsFor = (label: string): { value: Tab; label: string; icon: React.ReactNode }[] => [
  { value: 'adjustments', label, icon: <ClipboardList /> },
  { value: 'worksheet', label: '精算表', icon: <FileSpreadsheet /> },
  { value: 'statements', label: '財務諸表', icon: <Landmark /> },
];

const mono = 'font-mono tabular-nums';
const amt = (n: number) => (n ? formatAmount(n) : '');
const linesOf = (s: string) => parseShiwake(s).entries.flatMap((e) => e.lines);

function TrialBalanceTable({ text, title }: { text: string; title: string }) {
  const open = useAccountSheet((s) => s.open);
  const lines = useMemo(() => linesOf(text), [text]);
  const side = (sd: 'dr' | 'cr', title: string) => {
    const xs = lines.filter((l) => l.side === sd);
    return (
      <div>
        <div className="bg-slate-50 px-4 py-1.5 text-xs font-semibold text-slate-500 dark:bg-slate-800/50">
          {title}
        </div>
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {xs.map((l) => (
            <li key={l.account} className="flex gap-2 px-4 py-1">
              <button
                type="button"
                onClick={() => open(l.account)}
                className="min-w-0 flex-1 text-left underline decoration-slate-300 decoration-dotted underline-offset-4 dark:decoration-slate-600"
              >
                {l.account}
              </button>
              <span className={mono}>{formatAmount(l.amount)}</span>
            </li>
          ))}
          <li className="flex gap-2 px-4 py-1 font-semibold">
            <span className="flex-1">合計</span>
            <span className={mono}>{formatAmount(xs.reduce((s, l) => s + l.amount, 0))}</span>
          </li>
        </ul>
      </div>
    );
  };
  return (
    <Card className="overflow-hidden">
      <h2 className="px-4 pt-3 pb-2 font-semibold">{title}</h2>
      <div className="grid border-t border-slate-200 sm:grid-cols-2 sm:divide-x dark:divide-slate-700 dark:border-slate-700">
        {side('dr', '借方')}
        {side('cr', '貸方')}
      </div>
    </Card>
  );
}

function WorksheetTable({ ws }: { ws: Worksheet }) {
  const open = useAccountSheet((s) => s.open);
  const head = ['試算表', '修正記入', '損益計算書', '貸借対照表'];
  const ni = ws.netIncome;
  return (
    <Card className="overflow-hidden">
      <h2 className="px-4 pt-3 pb-2 font-semibold">精算表</h2>
      <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
        <table className="w-full min-w-[46rem] text-xs">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
            <tr>
              <th rowSpan={2} className="px-2 py-1.5 text-left font-medium">
                勘定科目
              </th>
              {head.map((h) => (
                <th
                  key={h}
                  colSpan={2}
                  className="border-l border-slate-200 px-2 py-1 font-medium dark:border-slate-700"
                >
                  {h}
                </th>
              ))}
            </tr>
            <tr>
              {head.map((h) => (
                <Fragment key={h}>
                  <th className="border-l border-slate-200 px-2 py-1 text-right font-medium dark:border-slate-700">
                    借方
                  </th>
                  <th className="px-2 py-1 text-right font-medium">貸方</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {ws.rows.map((r) => (
              <tr key={r.account}>
                <td className="px-2 py-1 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => open(r.account)}
                    className="text-left underline decoration-slate-300 decoration-dotted underline-offset-4 dark:decoration-slate-600"
                  >
                    {r.account}
                  </button>
                </td>
                {[r.tbDr, r.tbCr, r.adjDr, r.adjCr, r.plDr, r.plCr, r.bsDr, r.bsCr].map((v, i) => (
                  <td
                    key={i}
                    className={cn(
                      mono,
                      'px-2 py-1 text-right',
                      i % 2 === 0 && 'border-l border-slate-200 dark:border-slate-700',
                      (i === 2 || i === 3) && v && 'text-amber-700 dark:text-amber-300',
                    )}
                  >
                    {amt(v)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="text-accent-800 dark:text-accent-200">
              <td className="px-2 py-1">{ni >= 0 ? '当期純利益' : '当期純損失'}</td>
              <td className="border-l border-slate-200 dark:border-slate-700" colSpan={2} />
              <td className="border-l border-slate-200 dark:border-slate-700" colSpan={2} />
              <td
                className={cn(
                  mono,
                  'border-l border-slate-200 px-2 py-1 text-right dark:border-slate-700',
                )}
              >
                {ni > 0 ? formatAmount(ni) : ''}
              </td>
              <td className={cn(mono, 'px-2 py-1 text-right')}>
                {ni < 0 ? formatAmount(-ni) : ''}
              </td>
              <td
                className={cn(
                  mono,
                  'border-l border-slate-200 px-2 py-1 text-right dark:border-slate-700',
                )}
              >
                {ni < 0 ? formatAmount(-ni) : ''}
              </td>
              <td className={cn(mono, 'px-2 py-1 text-right')}>{ni > 0 ? formatAmount(ni) : ''}</td>
            </tr>
            <tr className="font-semibold">
              <td className="px-2 py-1">合計</td>
              {[
                ws.totals.tbDr,
                ws.totals.tbCr,
                ws.totals.adjDr,
                ws.totals.adjCr,
                ws.totals.plDr + Math.max(ni, 0),
                ws.totals.plCr + Math.max(-ni, 0),
                ws.totals.bsDr + Math.max(-ni, 0),
                ws.totals.bsCr + Math.max(ni, 0),
              ].map((v, i) => (
                <td
                  key={i}
                  className={cn(
                    mono,
                    'px-2 py-1 text-right',
                    i % 2 === 0 && 'border-l border-slate-200 dark:border-slate-700',
                  )}
                >
                  {formatAmount(v)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function ExercisePage() {
  const { id = '' } = useParams<{ id: string }>();
  return <ExerciseBody key={id} id={id} />;
}

function ExerciseBody({ id }: { id: string }) {
  const params = useParams<{ tab?: string }>();
  const [, navigate] = useLocation();
  const tab: Tab = tabsFor('').some((t) => t.value === params.tab)
    ? (params.tab as Tab)
    : 'adjustments';
  const book = useContent((s) => s.book);
  useContentIndex();
  const [ex, setEx] = useState<ClosingExercise | null>(null);
  const labels = EXERCISE_LABELS[ex?.kind ?? 'closing'];
  const TABS = tabsFor(labels.adjustment);
  const [error, setError] = useState<string | null>(null);
  const [applyAll, setApplyAll] = useState(false);
  const setId = `exercise:${id}`;

  useEffect(() => {
    let stale = false;
    fetchExercise(id).then(
      (e) => !stale && setEx(e),
      (e) => !stale && setError(errorMessage(e)),
    );
    return () => {
      stale = true;
    };
  }, [id]);

  // 解いた（正解した・答えを見た）決算整理は、この端末の記録から復元する
  const attempts = useLiveQuery(
    () => db.drillAttempts.where('setId').equals(setId).toArray(),
    [setId],
  );
  const status = useMemo(() => {
    const m = new Map<string, 'ok' | 'ng' | 'revealed'>();
    for (const a of attempts ?? []) {
      const prev = m.get(a.questionId);
      if (a.correct) m.set(a.questionId, a.revealed ? (prev === 'ok' ? 'ok' : 'revealed') : 'ok');
      else if (!prev) m.set(a.questionId, 'ng');
    }
    return m;
  }, [attempts]);

  const applied = useMemo(
    () =>
      ex?.adjustments.filter((a) => {
        const s = status.get(a.id);
        return applyAll || s === 'ok' || s === 'revealed';
      }) ?? [],
    [ex, status, applyAll],
  );
  const ws = useMemo(
    () =>
      ex && book
        ? buildWorksheet(
            linesOf(ex.trialBalance),
            applied.map((a) => linesOf(a.answer)),
            book,
          )
        : null,
    [ex, book, applied],
  );
  const statements = useMemo(() => {
    if (!ex || !book) return null;
    const entries = [
      {
        id: 'tb',
        date: ex.closingDate,
        memo: EXERCISE_LABELS[ex.kind].trialBalance,
        lines: linesOf(ex.trialBalance),
      },
      ...applied.map((a) => ({
        id: a.id,
        date: ex.closingDate,
        memo: a.question,
        lines: linesOf(a.answer),
      })),
    ];
    return buildStatements(buildLedger(entries, book));
  }, [ex, book, applied]);

  const solved = ex ? ex.adjustments.filter((a) => status.get(a.id) === 'ok').length : 0;
  useFocus(
    ex && ws
      ? {
          kind: 'other',
          page: `決算の総合演習「${ex.title}」（${TABS.find((t) => t.value === tab)?.label}。正解した${labels.adjustment} ${solved}/${ex.adjustments.length}。反映した整理での当期純利益 ${ws.netIncome}）`,
        }
      : { kind: 'other', page: '決算の総合演習' },
  );

  const review = useReviewOnce(setId);
  const onJudged = (qid: string) => (o: ExerciseOutcome) => {
    review(qid, o.result.correct, o.revealed);
    void recordAttempt({
      setId,
      questionId: qid,
      correct: o.result.correct,
      revealed: o.revealed,
      kind: o.result.kind,
    });
  };

  return (
    <>
      <PageHeader
        title={ex?.title ?? '決算の総合演習'}
        back={<BackButton to="/drill" label="練習へ" />}
      />
      <PageBody wide>
        {error && <p className="text-sm text-rose-600">読み込めませんでした: {error}</p>}
        {!ex && !error && <p className="text-sm text-slate-500">読み込み中…</p>}
        {ex && ws && statements && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">{ex.summary}</p>
            <HistoryLink targetId={setId} />
            <div className="flex items-center gap-3 text-sm">
              <Progress value={solved / ex.adjustments.length} className="h-2 flex-1" />
              <span className="tabular-nums">
                正解 {solved}/{ex.adjustments.length}
              </span>
            </div>
            <Tabs
              value={tab}
              items={TABS}
              onChange={(t) => navigate(`/exercise/${id}/${t}`, { replace: true })}
            />
            {tab === 'adjustments' && (
              <div className="space-y-4">
                {ex.note && (
                  <Card className="p-4 text-sm leading-relaxed">
                    <h2 className="mb-1 font-semibold">前提</h2>
                    {ex.note}
                  </Card>
                )}
                <TrialBalanceTable text={ex.trialBalance} title={labels.trialBalance} />
                <h2 className="px-1 font-semibold">{labels.items}</h2>
                {ex.adjustments.map((a, i) => {
                  const s = status.get(a.id);
                  return (
                    <Card key={a.id} className="space-y-3 p-4">
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-accent-700 dark:text-accent-300">
                          {i + 1}.
                        </span>
                        <p className="min-w-0 flex-1 leading-relaxed">{a.question}</p>
                        {s === 'ok' && (
                          <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                        )}
                        {s === 'ng' && <XCircle className="size-5 shrink-0 text-rose-500" />}
                      </div>
                      <ShiwakeExercise
                        question={a}
                        seed={`${id}:${a.id}`}
                        onJudged={onJudged(a.id)}
                      />
                    </Card>
                  );
                })}
                <p className="text-sm">
                  解き終わったら、
                  <Link
                    href={`/exercise/${id}/worksheet`}
                    className="text-accent-700 underline dark:text-accent-300"
                  >
                    精算表
                  </Link>
                  と
                  <Link
                    href={`/exercise/${id}/statements`}
                    className="text-accent-700 underline dark:text-accent-300"
                  >
                    財務諸表
                  </Link>
                  を確かめましょう。
                </p>
              </div>
            )}
            {tab !== 'adjustments' && (
              <Card className="flex items-center gap-3 p-4 text-sm">
                <span className="min-w-0 flex-1">
                  {applyAll
                    ? `すべての${labels.adjustment}（模範解答）を反映しています`
                    : `正解した・答えを見た${labels.adjustment}だけを反映しています（${applied.length}/${ex.adjustments.length}）`}
                </span>
                <label className="flex items-center gap-2 text-xs">
                  すべて反映
                  <Switch id="apply-all" checked={applyAll} onChange={setApplyAll} />
                </label>
              </Card>
            )}
            {tab === 'worksheet' && <WorksheetTable ws={ws} />}
            {tab === 'statements' && (
              <StatementsView
                s={statements}
                onAccount={(a) => useAccountSheet.getState().open(a)}
              />
            )}
            <BasisInfo basis={ex.basis} asOf={ex.asOf} updated={ex.updated} />
          </>
        )}
      </PageBody>
    </>
  );
}
