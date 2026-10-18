/**
 * 苦手の分析（プログラムが集計する）。
 * 問題ごとに最後の答え合わせの結果を使い、分野ごとの正解率・間違えやすい勘定科目・間違いの種類を出す。
 */
import type { DrillAttempt } from '../db/db.ts';

export interface SetInfo {
  /** 分野の id */
  track: string;
  /** 問題 id → 正解の仕訳の勘定科目（選択問題は空） */
  accounts: Map<string, string[]>;
}

export interface TrackStat {
  track: string;
  tried: number;
  correct: number;
  /** 正解率（%） */
  rate: number;
}

export interface AccountStat {
  account: string;
  /** その科目を使う問題で、最後に間違えた数 */
  wrong: number;
  tried: number;
}

export interface Weakness {
  tracks: TrackStat[];
  accounts: AccountStat[];
  /** 間違いの種類 → 回数（最後の答え合わせが不正解の問題） */
  kinds: Record<string, number>;
  /** 最後に間違えた（または答えを見た）問題 */
  wrongQuestions: { setId: string; questionId: string }[];
  tried: number;
}

export const MISTAKE_LABELS: Record<string, string> = {
  swapped: '借方と貸方が逆',
  account: '勘定科目の選び方',
  amount: '金額',
  unbalanced: '貸借が合っていない',
  empty: '入力の漏れ',
  choice: '選択問題の選び方',
  revealed: '答えを見て解いた',
};

export function analyzeWeakness(attempts: DrillAttempt[], sets: Map<string, SetInfo>): Weakness {
  const latest = new Map<string, DrillAttempt>();
  for (const a of attempts) {
    const k = `${a.setId}\u0000${a.questionId}`;
    const cur = latest.get(k);
    if (!cur || cur.at <= a.at) latest.set(k, a);
  }
  const tracks = new Map<string, TrackStat>();
  const accounts = new Map<string, AccountStat>();
  const kinds: Record<string, number> = {};
  const wrongQuestions: Weakness['wrongQuestions'] = [];
  let tried = 0;
  for (const a of latest.values()) {
    const info = sets.get(a.setId);
    if (!info) continue;
    tried++;
    const ok = a.correct && !a.revealed;
    const t = tracks.get(info.track) ?? { track: info.track, tried: 0, correct: 0, rate: 0 };
    t.tried++;
    if (ok) t.correct++;
    tracks.set(info.track, t);
    for (const name of new Set(info.accounts.get(a.questionId) ?? [])) {
      const s = accounts.get(name) ?? { account: name, wrong: 0, tried: 0 };
      s.tried++;
      if (!ok) s.wrong++;
      accounts.set(name, s);
    }
    if (!ok) {
      const kind = a.correct ? 'revealed' : a.kind;
      kinds[kind] = (kinds[kind] ?? 0) + 1;
      wrongQuestions.push({ setId: a.setId, questionId: a.questionId });
    }
  }
  for (const t of tracks.values()) t.rate = Math.round((t.correct / t.tried) * 100);
  return {
    tracks: [...tracks.values()].sort((a, b) => a.rate - b.rate || b.tried - a.tried),
    accounts: [...accounts.values()]
      .filter((s) => s.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || b.wrong / b.tried - a.wrong / a.tried),
    kinds,
    wrongQuestions,
    tried,
  };
}
