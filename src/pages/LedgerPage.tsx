import { useMemo, useState } from 'react';
import {
  Banknote,
  BookCopy,
  FileSpreadsheet,
  Gauge,
  Landmark,
  NotebookPen,
  Sparkle,
  Trash2,
} from 'lucide-react';
import { CashFlowView } from '@/features/cashflow/CashFlowView';
import { AnalysisView } from '@/features/analysis/AnalysisView';
import { ratiosForAi } from '@/features/analysis/ratiosForAi';
import { analyze } from '@/lib/analysis/ratios';
import { buildIndirectCashFlow } from '@/lib/cashflow/indirect';
import { toast } from 'sonner';
import { useLocation, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Tabs } from '@/components/ui/Tabs';
import { useFocus } from '@/features/ai/useFocus';
import { useContent, useContentIndex } from '@/features/content/contentStore';
import { JournalForm } from '@/features/ledger/JournalForm';
import { LedgerDrill, type LedgerDrillItem } from '@/features/ledger/LedgerDrill';
import { useDrillStack } from '@/components/ui/useDrillStack';
import { clearJournal, loadScenario, useJournal } from '@/features/ledger/journalRepo';
import { JournalList, LedgerView, StatementsView, TrialBalanceView } from '@/features/ledger/views';
import { LevelBadge } from '@/features/learn/MetaBadges';
import type { Scenario } from '@/lib/content/schema';
import {
  buildLedger,
  buildStatements,
  closingBalanceSheet,
  trialBalance,
} from '@/lib/ledger/ledger';
import { errorMessage } from '@/lib/utils/format';

type Tab = 'journal' | 'ledger' | 'trial' | 'statements' | 'cashflow' | 'analysis';
const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'journal', label: '仕訳帳', icon: <NotebookPen /> },
  { value: 'ledger', label: '元帳', icon: <BookCopy /> },
  { value: 'trial', label: '試算表', icon: <FileSpreadsheet /> },
  { value: 'statements', label: '決算書', icon: <Landmark /> },
  { value: 'cashflow', label: 'CF', icon: <Banknote /> },
  { value: 'analysis', label: '分析', icon: <Gauge /> },
];

export default function LedgerPage() {
  const params = useParams<{ tab?: string }>();
  const [, navigate] = useLocation();
  const tab: Tab = TABS.some((t) => t.value === params.tab) ? (params.tab as Tab) : 'journal';
  const { index } = useContentIndex();
  const book = useContent((s) => s.book);
  const records = useJournal();
  const [confirm, setConfirm] = useState<null | 'clear' | Scenario>(null);
  const [samples, setSamples] = useState(false);
  const drill = useDrillStack<LedgerDrillItem>();
  const openAccount = (account: string) => drill.open({ kind: 'account', account });

  // 集計はすべてプログラムで行う（転記・試算表・決算書）
  const ledger = useMemo(
    () => (records && book ? buildLedger(records, book) : []),
    [records, book],
  );
  const tb = useMemo(() => trialBalance(ledger), [ledger]);
  const statements = useMemo(() => buildStatements(ledger), [ledger]);
  // 帳簿は会社をつくったところから始まるので、期首の貸借対照表は空とする
  const cashFlow = useMemo(
    () =>
      book
        ? buildIndirectCashFlow({
            opening: new Map(),
            closing: closingBalanceSheet(ledger, statements.netIncome),
            netIncome: statements.netIncome,
            book,
          })
        : null,
    [ledger, statements, book],
  );

  const ratios = useMemo(
    () => (book ? analyze(new Map(ledger.map((l) => [l.account, l.balance])), book) : []),
    [ledger, book],
  );

  // 帳簿の集計（プログラムが計算した数字）を AI に伝える
  useFocus({
    kind: 'ledger',
    tab: TABS.find((t) => t.value === tab)?.label ?? tab,
    entryCount: records?.length ?? 0,
    balances: Object.fromEntries(ledger.map((l) => [l.account, l.balance])),
    trialBalanced: tb.drTotal === tb.crTotal,
    netIncome: statements.netIncome,
    unsettled: statements.unsettled.map((u) => u.account),
    ratios: tab === 'analysis' ? ratiosForAi(ratios) : undefined,
  });

  const load = async (s: Scenario) => {
    if (!book) return;
    try {
      await loadScenario(s, book);
      toast.success(`「${s.title}」を読み込みました`);
    } catch (e) {
      toast.error(`読み込めませんでした: ${errorMessage(e)}`);
    }
  };

  return (
    <>
      <PageHeader
        title="帳簿"
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSamples(true)}
              title="サンプルの取引"
            >
              <Sparkle />
              <span className="max-sm:sr-only">サンプル</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirm('clear')}
              disabled={!records?.length}
              title="帳簿をクリア"
            >
              <Trash2 />
              <span className="max-sm:sr-only">クリア</span>
            </Button>
          </>
        }
      />
      <PageBody wide>
        <Tabs
          value={tab}
          items={TABS}
          onChange={(t) =>
            navigate(t === 'journal' ? '/ledger' : `/ledger/${t}`, { replace: true })
          }
        />
        {tab === 'journal' && (
          <>
            <JournalForm />
            {records && <JournalList records={records} />}
          </>
        )}
        {tab === 'ledger' && (
          <LedgerView
            ledger={ledger}
            onEntry={(entryId) => drill.open({ kind: 'entry', entryId })}
          />
        )}
        {tab === 'trial' && <TrialBalanceView tb={tb} onAccount={openAccount} />}
        {tab === 'statements' && <StatementsView s={statements} onAccount={openAccount} />}
        {tab === 'cashflow' &&
          (cashFlow && ledger.length > 0 ? (
            <CashFlowView
              cf={cashFlow}
              onAccount={openAccount}
              note="帳簿は何もないところから始まるとして、期首の残高を 0 にしています。"
            />
          ) : (
            <p className="text-sm text-slate-500">仕訳を入力すると、ここに表示されます。</p>
          ))}
        {tab === 'analysis' &&
          (ledger.length > 0 ? (
            <AnalysisView ratios={ratios} onAccount={openAccount} />
          ) : (
            <p className="text-sm text-slate-500">仕訳を入力すると、ここに表示されます。</p>
          ))}
      </PageBody>

      <LedgerDrill
        stack={drill.stack}
        ledger={ledger}
        records={records ?? []}
        onPush={drill.push}
        onBack={drill.back}
        onClose={drill.close}
      />
      <BottomSheet
        open={samples}
        onClose={() => setSamples(false)}
        title="サンプルの取引を読み込む"
        description="一連の取引を帳簿に読み込みます。元帳・試算表・決算書がどうなるか見てみましょう"
      >
        <div className="space-y-2">
          {index?.scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSamples(false);
                if (records?.length) setConfirm(s);
                else void load(s);
              }}
              className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-accent-400 hover:bg-accent-50/50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <span className="flex items-center gap-2 font-medium">
                {s.title}
                <LevelBadge level={s.level} />
              </span>
              <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                {s.summary}（{s.entries.length} 件）
              </span>
            </button>
          ))}
        </div>
      </BottomSheet>
      <ConfirmDialog
        open={confirm === 'clear'}
        title="帳簿をクリアしますか？"
        description="入力した仕訳をすべて消します。元に戻せません。"
        confirmLabel="クリア"
        danger
        onConfirm={() => void clearJournal().then(() => toast.success('帳簿をクリアしました'))}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={!!confirm && confirm !== 'clear'}
        title="今の帳簿を置き換えますか？"
        description="サンプルを読み込むと、いま入力されている仕訳は消えます。"
        confirmLabel="置き換える"
        danger
        onConfirm={() => confirm && confirm !== 'clear' && void load(confirm)}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
