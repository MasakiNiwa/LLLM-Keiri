import { parseAmount } from '@/lib/journal/amount';
import type { JournalLine, Side } from '@/lib/journal/types';
import { createId } from '@/lib/utils/id';

/** 入力中の仕訳の 1 行（金額は入力した文字のまま持つ） */
export interface DraftLine {
  id: string;
  side: Side;
  account: string;
  amount: string;
}

export function emptyDraft(): DraftLine[] {
  return [
    { id: createId(), side: 'dr', account: '', amount: '' },
    { id: createId(), side: 'cr', account: '', amount: '' },
  ];
}

export function draftFromLines(lines: JournalLine[]): DraftLine[] {
  const d = lines.map((l) => ({
    id: createId(),
    side: l.side,
    account: l.account,
    amount: l.amount.toLocaleString('ja-JP'),
  }));
  for (const side of ['dr', 'cr'] as const) {
    if (!d.some((l) => l.side === side)) d.push({ id: createId(), side, account: '', amount: '' });
  }
  return d;
}

/** 入力中の行を仕訳の行にする（科目か金額が空の行は除く。金額が読めない行は amount: NaN） */
export function draftToLines(draft: DraftLine[]): JournalLine[] {
  return draft
    .filter((l) => l.account.trim() !== '' || l.amount.trim() !== '')
    .map((l) => ({
      side: l.side,
      account: l.account.trim(),
      amount: parseAmount(l.amount) ?? Number.NaN,
    }));
}

/** 入力の問題（科目が空・金額が読めない） */
export function draftProblems(draft: DraftLine[]): string[] {
  const out: string[] = [];
  for (const l of draftToLines(draft)) {
    if (!l.account) out.push('勘定科目を選んでいない行があります');
    else if (!Number.isFinite(l.amount) || l.amount <= 0)
      out.push(`「${l.account}」の金額を正しく入力してください`);
  }
  return [...new Set(out)];
}
