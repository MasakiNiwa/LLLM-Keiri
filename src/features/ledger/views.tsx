import { useState } from 'react';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAccountSheet } from '@/features/accounts/accountSheetStore';
import { JournalTable } from '@/features/journal/JournalTable';
import { ELEMENT_LABELS } from '@/lib/content/schema';
import type { JournalRecord } from '@/lib/db/db';
import { formatAmount } from '@/lib/journal/amount';
import type {
  AccountLedger,
  Posting,
  StatementLine,
  Statements,
  TrialBalance,
} from '@/lib/ledger/ledger';
import { cn } from '@/lib/utils/cn';
import { JournalForm } from './JournalForm';
import { deleteJournal } from './journalRepo';

const mono = 'font-mono tabular-nums';

function shortDate(d: string): string {
  const [, m, day] = d.split('-').map(Number);
  return `${m}/${day}`;
}

/** 金額（マイナスは △ を付ける。日本の決算書の書き方） */
function Yen({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn(mono, className)}>{n < 0 ? `△${formatAmount(-n)}` : formatAmount(n)}</span>
  );
}

// ---------------- 仕訳帳 ----------------

export function JournalList({ records }: { records: JournalRecord[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<JournalRecord | null>(null);
  if (records.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        まだ仕訳がありません。上の欄から入力するか、「サンプル」から取引を読み込んでみましょう。
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {records.map((r) =>
        editing === r.id ? (
          <JournalForm key={r.id} editing={r} onDone={() => setEditing(null)} />
        ) : (
          <div key={r.id} className="space-y-1.5">
            <div className="flex items-center gap-2 px-1 text-sm">
              <span className={cn(mono, 'text-slate-500')}>{r.date}</span>
              <span className="min-w-0 flex-1 truncate">{r.memo}</span>
              <button
                type="button"
                onClick={() => setEditing(r.id)}
                aria-label="直す"
                title="直す"
                className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(r)}
                aria-label="消す"
                title="消す"
                className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            <JournalTable entry={{ lines: r.lines }} />
          </div>
        ),
      )}
      <ConfirmDialog
        open={!!deleting}
        title="この仕訳を消しますか？"
        description={deleting ? `${deleting.date} ${deleting.memo}` : undefined}
        confirmLabel="消す"
        danger
        onConfirm={() => deleting && void deleteJournal(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

// ---------------- 総勘定元帳（T 字勘定） ----------------

/** ドリルダウン: 勘定科目・仕訳を押したときの動き（無ければ押せない表示） */
export interface DrillHandlers {
  onAccount?: (account: string) => void;
  onEntry?: (entryId: string) => void;
}

const drillable =
  'rounded-md text-left hover:bg-accent-50 hover:text-accent-800 dark:hover:bg-accent-900/30 dark:hover:text-accent-200';

function TSide({
  postings,
  total,
  onEntry,
}: {
  postings: Posting[];
  total: number;
  onEntry?: (entryId: string) => void;
}) {
  return (
    <div className="min-w-0 text-[0.85rem]">
      {postings.map((p, i) => {
        const body = (
          <>
            <span className={cn(mono, 'shrink-0 text-slate-400')}>{shortDate(p.date)}</span>
            <span className="min-w-0 flex-1 truncate">{p.counterpart}</span>
            <span className={mono}>{formatAmount(p.amount)}</span>
          </>
        );
        return onEntry ? (
          <button
            key={i}
            type="button"
            title={`${p.memo}（押すと仕訳を表示）`}
            onClick={() => onEntry(p.entryId)}
            className={cn('flex w-full gap-1.5 px-2 py-0.5', drillable)}
          >
            {body}
          </button>
        ) : (
          <div key={i} className="flex gap-1.5 px-2 py-0.5" title={p.memo}>
            {body}
          </div>
        );
      })}
      <div className="mt-1 flex justify-end border-t border-slate-200 px-2 pt-0.5 text-xs text-slate-500 dark:border-slate-700">
        <span className={mono}>{formatAmount(total)}</span>
      </div>
    </div>
  );
}

export function TAccount({
  l,
  onEntry,
}: {
  l: AccountLedger;
  onEntry?: (entryId: string) => void;
}) {
  const open = useAccountSheet((s) => s.open);
  const side = l.balance >= 0 ? '借方' : '貸方';
  return (
    <Card className="overflow-hidden">
      <div className="flex items-baseline gap-2 border-b-2 border-slate-400 px-3 py-2 dark:border-slate-500">
        <button
          type="button"
          onClick={() => open(l.account)}
          className="font-semibold hover:text-accent-700 dark:hover:text-accent-300"
        >
          {l.account}
        </button>
        <span className="text-xs text-slate-500">{ELEMENT_LABELS[l.element]}</span>
        <span className="ml-auto text-xs text-slate-500">
          残高（{side}）
          <Yen
            n={Math.abs(l.balance)}
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          />
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x-2 divide-slate-400 py-1 dark:divide-slate-500">
        <TSide postings={l.debits} total={l.drTotal} onEntry={onEntry} />
        <TSide postings={l.credits} total={l.crTotal} onEntry={onEntry} />
      </div>
    </Card>
  );
}

export function LedgerView({ ledger, onEntry }: { ledger: AccountLedger[] } & DrillHandlers) {
  const [selected, setSelected] = useState<string | null>(null);
  if (ledger.length === 0) return <EmptyHint />;
  const shown = selected ? ledger.filter((l) => l.account === selected) : ledger;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Chip active={selected === null} onClick={() => setSelected(null)}>
          すべて
        </Chip>
        {ledger.map((l) => (
          <Chip
            key={l.account}
            active={selected === l.account}
            onClick={() => setSelected(selected === l.account ? null : l.account)}
          >
            {l.account}
          </Chip>
        ))}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        左が借方、右が貸方。日付・相手の勘定科目（相手が 2
        つ以上なら「諸口」）・金額の順に転記しています。行を押すと、もとの仕訳を表示します。
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {shown.map((l) => (
          <TAccount key={l.account} l={l} onEntry={onEntry} />
        ))}
      </div>
    </div>
  );
}

// ---------------- 試算表 ----------------

export function TrialBalanceView({ tb, onAccount }: { tb: TrialBalance } & DrillHandlers) {
  // スマホでは合計の列を隠して残高試算表にする（押すと合計も表示）
  const [totalsShown, setTotalsShown] = useState(false);
  if (tb.rows.length === 0) return <EmptyHint />;
  const ok = tb.drTotal === tb.crTotal;
  const totalCol = totalsShown ? '' : 'hidden sm:table-cell';
  return (
    <Card className="overflow-x-auto">
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <h2 className="font-semibold">合計残高試算表</h2>
        <button
          type="button"
          onClick={() => setTotalsShown(!totalsShown)}
          className="ml-auto rounded-lg px-2 py-1 text-xs text-accent-700 hover:bg-slate-100 sm:hidden dark:text-accent-300 dark:hover:bg-slate-800"
        >
          {totalsShown ? '合計を隠す' : '合計も表示'}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          <tr>
            <th className="px-2 py-1.5 text-right font-medium">借方残高</th>
            <th className={cn('px-2 py-1.5 text-right font-medium', totalCol)}>借方合計</th>
            <th className="px-2 py-1.5 text-center font-medium">勘定科目</th>
            <th className={cn('px-2 py-1.5 text-right font-medium', totalCol)}>貸方合計</th>
            <th className="px-2 py-1.5 text-right font-medium">貸方残高</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {tb.rows.map((r) => (
            <tr key={r.account}>
              <td className={cn(mono, 'px-2 py-1.5 text-right')}>
                {r.balance > 0 && formatAmount(r.balance)}
              </td>
              <td className={cn(mono, 'px-2 py-1.5 text-right text-slate-500', totalCol)}>
                {r.drTotal > 0 && formatAmount(r.drTotal)}
              </td>
              <td className="px-2 py-1.5 text-center whitespace-nowrap">
                {onAccount ? (
                  <button
                    type="button"
                    onClick={() => onAccount(r.account)}
                    className={cn('px-1 underline decoration-dotted underline-offset-4', drillable)}
                  >
                    {r.account}
                  </button>
                ) : (
                  r.account
                )}
              </td>
              <td className={cn(mono, 'px-2 py-1.5 text-right text-slate-500', totalCol)}>
                {r.crTotal > 0 && formatAmount(r.crTotal)}
              </td>
              <td className={cn(mono, 'px-2 py-1.5 text-right')}>
                {r.balance < 0 && formatAmount(-r.balance)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-300 font-semibold dark:border-slate-600">
          <tr>
            <td className={cn(mono, 'px-2 py-2 text-right')}>{formatAmount(tb.drBalance)}</td>
            <td className={cn(mono, 'px-2 py-2 text-right', totalCol)}>
              {formatAmount(tb.drTotal)}
            </td>
            <td className="px-2 py-2 text-center">合計</td>
            <td className={cn(mono, 'px-2 py-2 text-right', totalCol)}>
              {formatAmount(tb.crTotal)}
            </td>
            <td className={cn(mono, 'px-2 py-2 text-right')}>{formatAmount(tb.crBalance)}</td>
          </tr>
        </tfoot>
      </table>
      <p
        className={cn(
          'px-3 py-2 text-xs',
          ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400',
        )}
      >
        {ok ? '✓ 借方と貸方の合計が一致しています' : '借方と貸方の合計が一致していません'}
      </p>
    </Card>
  );
}

// ---------------- 決算書 ----------------

export function StatementSide({
  title,
  sections,
  total,
  onAccount,
}: {
  title: string;
  sections: { label: string; lines: StatementLine[]; extra?: StatementLine | StatementLine[] }[];
  total: number;
  onAccount?: (account: string) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800/60">
        {title}
      </div>
      <div className="flex-1 px-3 py-2 text-sm">
        {sections.map((s) => (
          <div key={s.label} className="mb-2">
            <div className="text-xs font-semibold text-slate-500">{s.label}</div>
            {s.lines.map((l) =>
              onAccount ? (
                <button
                  key={l.account}
                  type="button"
                  onClick={() => onAccount(l.account)}
                  title="押すと内訳を表示"
                  className={cn(
                    'flex w-full gap-2 px-1 py-0.5',
                    drillable,
                    l.contra && 'pl-4 text-slate-500',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate underline decoration-slate-300 decoration-dotted underline-offset-4 dark:decoration-slate-600">
                    {l.account}
                  </span>
                  <Yen n={l.amount} />
                </button>
              ) : (
                <div
                  key={l.account}
                  className={cn('flex gap-2 py-0.5', l.contra && 'pl-3 text-slate-500')}
                >
                  <span className="min-w-0 flex-1 truncate">{l.account}</span>
                  <Yen n={l.amount} />
                </div>
              ),
            )}
            {(Array.isArray(s.extra) ? s.extra : s.extra ? [s.extra] : []).map((l) => (
              <div
                key={l.account}
                className={cn(
                  'flex gap-2 py-0.5',
                  onAccount && 'px-1',
                  l.contra && 'pl-3 text-slate-500',
                )}
              >
                <span className="min-w-0 flex-1 truncate">{l.account}</span>
                <Yen n={l.amount} />
              </div>
            ))}
            {s.lines.length === 0 && !s.extra && <div className="py-0.5 text-slate-400">—</div>}
          </div>
        ))}
      </div>
      <div className="flex border-t-2 border-slate-300 px-3 py-1.5 text-sm font-semibold dark:border-slate-600">
        <span className="flex-1">合計</span>
        <Yen n={total} />
      </div>
    </div>
  );
}

export function StatementsView({ s, onAccount }: { s: Statements } & DrillHandlers) {
  if (s.assets.length + s.liabilities.length + s.revenues.length + s.expenses.length === 0)
    return <EmptyHint />;
  const profitLine: StatementLine = {
    account: s.netIncome >= 0 ? '当期純利益' : '当期純損失',
    amount: Math.abs(s.netIncome),
    contra: false,
  };
  const bsRight = s.totalLiabilities + s.totalEquity + s.netIncome;
  return (
    <div className="space-y-4">
      {s.unsettled.length > 0 && (
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          {s.unsettled.map((u) => u.account).join('・')}
          に残高があります。決算までに正しい科目に振り替えましょう（決算書には含めていません）。
        </p>
      )}
      <Card className="overflow-hidden">
        <h2 className="px-3 pt-3 pb-2 font-semibold">貸借対照表</h2>
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
                  account: `${profitLine.account}（当期分）`,
                  amount: s.netIncome,
                  contra: false,
                },
              },
            ]}
            total={bsRight}
            onAccount={onAccount}
          />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <h2 className="px-3 pt-3 pb-2 font-semibold">損益計算書</h2>
        <div className="grid border-t border-slate-200 sm:grid-cols-2 sm:divide-x dark:divide-slate-700 dark:border-slate-700">
          <StatementSide
            title="費用"
            sections={[
              {
                label: '費用',
                lines: s.expenses,
                extra: s.netIncome >= 0 ? profitLine : undefined,
              },
            ]}
            total={s.totalExpenses + Math.max(0, s.netIncome)}
            onAccount={onAccount}
          />
          <StatementSide
            title="収益"
            sections={[
              {
                label: '収益',
                lines: s.revenues,
                extra: s.netIncome < 0 ? profitLine : undefined,
              },
            ]}
            total={s.totalRevenues + Math.max(0, -s.netIncome)}
            onAccount={onAccount}
          />
        </div>
      </Card>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        入力した仕訳の残高から作った、学習用の簡単な決算書です（勘定式）。科目を押すと、元帳（T
        字勘定）→
        もとの仕訳へとたどれます。売れ残った商品の調整（売上原価の計算）や減価償却などの決算整理は、仕訳として入力すると反映されます。
      </p>
    </div>
  );
}

function EmptyHint() {
  return (
    <Card className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
      仕訳を入力すると、ここに表示されます。
    </Card>
  );
}
