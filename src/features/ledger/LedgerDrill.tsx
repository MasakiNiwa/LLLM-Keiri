import { Info } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DrillSheet } from '@/components/ui/DrillSheet';
import { useAccountSheet } from '@/features/accounts/accountSheetStore';
import { JournalTable } from '@/features/journal/JournalTable';
import type { JournalRecord } from '@/lib/db/db';
import type { AccountLedger } from '@/lib/ledger/ledger';
import { TAccount } from './views';

export type LedgerDrillItem =
  { kind: 'account'; account: string } | { kind: 'entry'; entryId: string };

function label(item: LedgerDrillItem, records: JournalRecord[]): string {
  if (item.kind === 'account') return item.account;
  const r = records.find((x) => x.id === item.entryId);
  return r ? `${r.date.slice(5).replace('-', '/')} の仕訳` : '仕訳';
}

/**
 * 帳簿のドリルダウン: 決算書・試算表の科目 → 元帳（T 字勘定）→ もとの仕訳 → その仕訳の科目 …
 */
export function LedgerDrill({
  stack,
  ledger,
  records,
  onPush,
  onBack,
  onClose,
}: {
  stack: LedgerDrillItem[];
  ledger: AccountLedger[];
  records: JournalRecord[];
  onPush: (item: LedgerDrillItem) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const top = stack.at(-1);
  const openAccountInfo = useAccountSheet((s) => s.open);
  const account =
    top?.kind === 'account' ? ledger.find((l) => l.account === top.account) : undefined;
  const entry = top?.kind === 'entry' ? records.find((r) => r.id === top.entryId) : undefined;
  return (
    <DrillSheet
      open={!!top}
      title={top ? label(top, records) : ''}
      description={
        top?.kind === 'account'
          ? '元帳（T 字勘定）。行を押すと、もとの仕訳を表示します'
          : '仕訳。科目を押すと、その科目の元帳を表示します'
      }
      trail={stack.map((s) => label(s, records))}
      onBack={onBack}
      onClose={onClose}
    >
      {top?.kind === 'account' &&
        (account ? (
          <div className="space-y-2">
            <TAccount l={account} onEntry={(entryId) => onPush({ kind: 'entry', entryId })} />
            <button
              type="button"
              onClick={() => openAccountInfo(account.account)}
              className="inline-flex items-center gap-1 text-sm text-accent-700 hover:underline dark:text-accent-300"
            >
              <Info className="size-4" />「{account.account}」の説明
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">この科目の記録はありません</p>
        ))}
      {top?.kind === 'entry' &&
        (entry ? (
          <Card className="space-y-2 p-3">
            <p className="text-sm">
              <span className="font-mono text-slate-500">{entry.date}</span> {entry.memo}
            </p>
            <JournalTable
              entry={{ lines: entry.lines }}
              onAccountClick={(name) => onPush({ kind: 'account', account: name })}
            />
          </Card>
        ) : (
          <p className="text-sm text-slate-500">
            この仕訳は見つかりません（消された可能性があります）
          </p>
        ))}
    </DrillSheet>
  );
}
