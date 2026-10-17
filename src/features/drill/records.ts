import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DrillAttempt } from '@/lib/db/db';

export async function recordAttempt(a: Omit<DrillAttempt, 'id' | 'at'>): Promise<void> {
  await db.drillAttempts.add({ ...a, at: Date.now() });
}

export interface SetStats {
  /** 一度でも答え合わせした問題の数 */
  tried: number;
  /** 最後の答え合わせが正解だった問題の数 */
  correct: number;
  lastAt?: number;
}

/** 問題セットごとの成績（setId → 成績） */
export function summarize(attempts: DrillAttempt[]): Map<string, SetStats> {
  const latest = new Map<string, DrillAttempt>();
  for (const a of attempts) {
    const key = `${a.setId}\u0000${a.questionId}`;
    const cur = latest.get(key);
    if (!cur || cur.at <= a.at) latest.set(key, a);
  }
  const out = new Map<string, SetStats>();
  for (const a of latest.values()) {
    const s = out.get(a.setId) ?? { tried: 0, correct: 0 };
    s.tried++;
    if (a.correct && !a.revealed) s.correct++;
    s.lastAt = Math.max(s.lastAt ?? 0, a.at);
    out.set(a.setId, s);
  }
  return out;
}

export function useDrillStats(): Map<string, SetStats> | undefined {
  return useLiveQuery(async () => summarize(await db.drillAttempts.toArray()), []);
}
