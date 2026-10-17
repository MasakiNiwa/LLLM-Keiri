import type { JournalEntry, JournalLine, Side } from './types.ts';

export interface Totals {
  dr: number;
  cr: number;
}

export function totals(lines: JournalLine[]): Totals {
  const t: Totals = { dr: 0, cr: 0 };
  for (const l of lines) t[l.side] += l.amount;
  return t;
}

/** 貸借が一致しているか */
export function isBalanced(entry: JournalEntry): boolean {
  const t = totals(entry.lines);
  return t.dr === t.cr;
}

/** 借方・貸方の行を、表示用に横に並べる（行数の多い方に合わせる） */
export function pairRows(
  lines: JournalLine[],
): [JournalLine | undefined, JournalLine | undefined][] {
  const dr = lines.filter((l) => l.side === 'dr');
  const cr = lines.filter((l) => l.side === 'cr');
  return Array.from({ length: Math.max(dr.length, cr.length) }, (_, i) => [dr[i], cr[i]]);
}

/** 片側の科目ごとの合計（同じ科目の行をまとめる） */
export function sumByAccount(lines: JournalLine[], side: Side): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of lines) {
    if (l.side === side) m.set(l.account, (m.get(l.account) ?? 0) + l.amount);
  }
  return m;
}
