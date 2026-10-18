import { useEffect, useMemo, useState } from 'react';
import { Banknote, Building2, FileSpreadsheet, Landmark, PieChart, Wrench } from 'lucide-react';
import { SegmentsView } from '@/features/consolidation/SegmentsView';
import { segmentReport } from '@/lib/consolidation/segments';
import { CashFlowView } from '@/features/cashflow/CashFlowView';
import { consolidatedCashFlow } from '@/lib/consolidation/cashflow';
import { Link, useLocation, useParams } from 'wouter';
import { BackButton } from '@/app/BackButton';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { useDrillStack } from '@/components/ui/useDrillStack';
import { useFocus } from '@/features/ai/useFocus';
import {
  ConsolidationDrill,
  type ConsolidationDrillItem,
} from '@/features/consolidation/ConsolidationDrill';
import {
  ConsolidatedStatementsView,
  EliminationsView,
  EntitiesView,
  type PracticeState,
  WorksheetView,
} from '@/features/consolidation/views';
import { useContent } from '@/features/content/contentStore';
import { BasisInfo } from '@/features/learn/MetaBadges';
import { consolidate } from '@/lib/consolidation/consolidate';
import { loadConsolidation } from '@/features/studio/userContentRepo';
import type { ConsolidationCase } from '@/lib/content/schema';
import { errorMessage } from '@/lib/utils/format';

type Tab = 'entities' | 'eliminations' | 'worksheet' | 'statements' | 'cashflow' | 'segments';
const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'entities', label: '各社', icon: <Building2 /> },
  { value: 'eliminations', label: '修正仕訳', icon: <Wrench /> },
  { value: 'worksheet', label: '精算表', icon: <FileSpreadsheet /> },
  { value: 'statements', label: '連結財務諸表', icon: <Landmark /> },
  { value: 'cashflow', label: 'CF', icon: <Banknote /> },
  { value: 'segments', label: 'セグメント', icon: <PieChart /> },
];

export default function ConsolidationPage() {
  const { id = '' } = useParams<{ id: string }>();
  // 事例が変わったら、ドリルダウンや練習の状態を持ち越さない
  return <ConsolidationCasePage key={id} />;
}

function ConsolidationCasePage() {
  const { id = '', tab: tabParam } = useParams<{ id: string; tab?: string }>();
  const [, navigate] = useLocation();
  const tab: Tab = TABS.some((t) => t.value === tabParam) ? (tabParam as Tab) : 'statements';
  const book = useContent((s) => s.book);
  const [loaded, setLoaded] = useState<{ id: string; c?: ConsolidationCase; error?: string }>({
    id: '',
  });
  const [enabledState, setEnabled] = useState<{ id: string; set: Set<string> } | null>(null);
  const drill = useDrillStack<ConsolidationDrillItem>();
  const [practiceState, setPractice] = useState<{ id: string; p: PracticeState | null } | null>(
    null,
  );
  const practice = practiceState?.id === id ? practiceState.p : null;

  useEffect(() => {
    let stale = false;
    if (!book) void useContent.getState().load();
    loadConsolidation(id).then(
      (c) => !stale && setLoaded({ id, c }),
      (e) => !stale && setLoaded({ id, error: errorMessage(e) }),
    );
    return () => {
      stale = true;
    };
  }, [id, book]);

  const c = loaded.id === id ? loaded.c : undefined;
  const error = loaded.id === id ? loaded.error : undefined;
  // 反映する修正仕訳（最初はすべて）
  const enabled = useMemo(
    () =>
      enabledState?.id === id ? enabledState.set : new Set(c?.eliminations.map((e) => e.id) ?? []),
    [enabledState, id, c],
  );
  const result = useMemo(
    () => (c && book ? consolidate(c, book, enabled) : null),
    [c, book, enabled],
  );
  const cashFlow = useMemo(
    () => (c && book && result ? consolidatedCashFlow(c, book, result) : null),
    [c, book, result],
  );
  const segments = useMemo(
    () => (c && book && result ? segmentReport(c, book, result, enabled) : null),
    [c, book, result, enabled],
  );
  // キャッシュ・フローのタブは期首の連結貸借対照表がある事例、セグメントのタブはセグメントを書いた事例だけ
  const tabs = TABS.filter(
    (t) => (t.value !== 'cashflow' || c?.opening) && (t.value !== 'segments' || segments),
  );
  const openAccount = (account: string) => drill.open({ kind: 'account', account });

  // 連結の数字（プログラムが計算したもの）と、ドリルダウンで見ている内訳を AI に伝える
  const top = drill.top;
  const drilled =
    top?.kind === 'account' ? result?.rows.find((r) => r.account === top.account) : undefined;
  useFocus(
    c && result
      ? {
          kind: 'consolidation',
          caseTitle: c.title,
          tab: TABS.find((t) => t.value === tab)?.label ?? tab,
          unit: c.unit,
          entities: c.entities.map(
            (e) =>
              `${e.name}${e.role === 'subsidiary' ? `（持分 ${e.ownership}%）` : ''}${e.currency !== 'JPY' ? `（${e.currency}・CR ${e.rates?.CR}・AR ${e.rates?.AR}・HR ${e.rates?.HR}）` : ''}`,
          ),
          eliminationsApplied: c.eliminations.filter((e) => enabled.has(e.id)).map((e) => e.title),
          eliminationsOff: c.eliminations.filter((e) => !enabled.has(e.id)).map((e) => e.title),
          figures: {
            totalAssets: result.statements.totalAssets,
            netIncome: result.netIncome,
            nciProfit: result.nciProfit,
            parentNetIncome: result.parentNetIncome,
          },
          drilldown: drilled
            ? {
                account: drilled.account,
                byEntity: Object.fromEntries(
                  c.entities.map((e) => [e.name, drilled.byEntity[e.id] ?? 0]),
                ),
                byElimination: Object.fromEntries(
                  c.eliminations
                    .filter((e) => drilled.byElimination[e.id] !== undefined)
                    .map((e) => [e.title, drilled.byElimination[e.id]]),
                ),
                consolidated: drilled.consolidated,
                sign: '借方が正、貸方が負',
              }
            : undefined,
          segments:
            tab === 'segments' && segments
              ? {
                  segments: Object.fromEntries(
                    segments.segments.map((s) => [
                      s.name,
                      { ...s.values, intersegmentSales: s.intersegmentSales },
                    ]),
                  ),
                  adjustments: segments.adjustmentTotals,
                  consolidated: segments.consolidated,
                  note: 'セグメント利益は営業利益、セグメント資産は各社の資産の合計。調整額は連結修正仕訳の分',
                }
              : undefined,
          cashFlow:
            tab === 'cashflow' && cashFlow
              ? {
                  営業活動: cashFlow.totals.operating,
                  投資活動: cashFlow.totals.investing,
                  財務活動: cashFlow.totals.financing,
                  換算差額: cashFlow.totals.translation,
                  期首の現金: cashFlow.openingCash,
                  期末の現金: cashFlow.closingCash,
                }
              : undefined,
        }
      : null,
  );

  return (
    <>
      <PageHeader
        title={c?.title ?? '連結'}
        back={<BackButton to="/consolidation" label="連結の一覧へ" />}
      />
      <PageBody wide key={id}>
        {error && (
          <p className="text-sm text-rose-600">
            読み込めませんでした: {error}{' '}
            <Link href="/consolidation" className="underline">
              一覧へ
            </Link>
          </p>
        )}
        {(!c || !result) && !error && <p className="text-sm text-slate-500">読み込み中…</p>}
        {c && result && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">{c.summary}</p>
            {practice && tab !== 'eliminations' && (
              <p className="rounded-xl bg-accent-50 px-3 py-2 text-sm text-accent-900 dark:bg-accent-900/30 dark:text-accent-100">
                練習モード中: 正解した修正仕訳だけを反映しています（
                {c.eliminations.filter((e) => enabled.has(e.id)).length} / {c.eliminations.length}）
              </p>
            )}
            <Tabs
              value={tab}
              items={tabs}
              onChange={(t) => navigate(`/consolidation/${id}/${t}`, { replace: true })}
            />
            {tab === 'entities' && <EntitiesView result={result} onAccount={openAccount} />}
            {tab === 'eliminations' && (
              <EliminationsView
                c={c}
                enabled={enabled}
                setEnabled={(set) => setEnabled({ id, set })}
                onAccount={openAccount}
                practice={practice}
                setPractice={(p) => setPractice({ id, p })}
              />
            )}
            {tab === 'worksheet' && <WorksheetView c={c} result={result} onAccount={openAccount} />}
            {tab === 'cashflow' && cashFlow && (
              <CashFlowView
                cf={cashFlow}
                unit={c.unit}
                onAccount={openAccount}
                note={`期首の連結貸借対照表: ${c.opening?.note ?? ''}。修正仕訳の反映を外すと、キャッシュ・フロー計算書も変わります（現金の増減と合わなくなる修正もあります）。`}
              />
            )}
            {tab === 'segments' && segments && (
              <SegmentsView c={c} report={segments} onDrill={drill.open} />
            )}
            {tab === 'statements' && (
              <ConsolidatedStatementsView c={c} result={result} onAccount={openAccount} />
            )}
            {c.lessons.length > 0 && (
              <p className="text-sm">
                関係するレッスン:{' '}
                {c.lessons.map((l, i) => (
                  <span key={l}>
                    {i > 0 && '・'}
                    <Link
                      href={`/learn/${l}`}
                      className="text-accent-700 hover:underline dark:text-accent-300"
                    >
                      {useContent.getState().index?.lessons.find((x) => x.id === l)?.title ?? l}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            <BasisInfo basis={c.basis} asOf={c.asOf} updated={c.updated} />
            <ConsolidationDrill
              c={c}
              result={result}
              enabled={enabled}
              segments={segments}
              stack={drill.stack}
              onPush={drill.push}
              onBack={drill.back}
              onClose={drill.close}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
