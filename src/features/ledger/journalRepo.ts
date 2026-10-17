import { useLiveQuery } from 'dexie-react-hooks';
import type { AccountBook } from '@/lib/content/accounts';
import type { Scenario } from '@/lib/content/schema';
import { db, type JournalRecord } from '@/lib/db/db';
import { parseShiwake } from '@/lib/journal/parse';
import type { JournalLine } from '@/lib/journal/types';
import { createId } from '@/lib/utils/id';

/** 帳簿の仕訳（日付順・同じ日は入力順） */
export function useJournal(): JournalRecord[] | undefined {
  return useLiveQuery(async () => {
    const all = await db.journal.toArray();
    return all.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  }, []);
}

/** 正式な科目名にそろえて保存する */
function normalize(lines: JournalLine[], book: AccountBook): JournalLine[] {
  return lines.map((l) => ({ ...l, account: book.canonical(l.account) }));
}

export async function addJournal(
  e: { date: string; memo: string; lines: JournalLine[] },
  book: AccountBook,
): Promise<void> {
  await db.journal.add({
    ...e,
    lines: normalize(e.lines, book),
    id: createId(),
    createdAt: Date.now(),
  });
}

export async function updateJournal(
  id: string,
  e: { date: string; memo: string; lines: JournalLine[] },
  book: AccountBook,
): Promise<void> {
  await db.journal.update(id, { ...e, lines: normalize(e.lines, book) });
}

export async function deleteJournal(id: string): Promise<void> {
  await db.journal.delete(id);
}

export async function clearJournal(): Promise<void> {
  await db.journal.clear();
}

/** サンプルの取引を読み込む（今の帳簿は消して置き換える） */
export async function loadScenario(s: Scenario, book: AccountBook): Promise<void> {
  const base = Date.now();
  const records: JournalRecord[] = s.entries.map((e, i) => ({
    id: createId(),
    date: e.date,
    memo: e.memo,
    lines: normalize(parseShiwake(e.shiwake).entries[0]?.lines ?? [], book),
    createdAt: base + i,
  }));
  await db.transaction('rw', db.journal, async () => {
    await db.journal.clear();
    await db.journal.bulkAdd(records);
  });
}
