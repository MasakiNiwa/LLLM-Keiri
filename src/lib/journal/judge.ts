import { sumByAccount, totals } from './balance.ts';
import type { JournalLine, Side } from './types.ts';
import { SIDE_LABELS } from './types.ts';

/** 採点の結果の種類（AI のリアクションや解説にもそのまま渡す） */
export type JudgeKind =
  | 'correct'
  /** 何も入力していない */
  | 'empty'
  /** 借方と貸方の合計が合っていない */
  | 'unbalanced'
  /** 科目と金額は合っているが、借方と貸方が逆 */
  | 'swapped'
  /** 勘定科目が違う（足りない・余分） */
  | 'account'
  /** 科目は合っているが金額が違う */
  | 'amount';

export interface JudgeIssue {
  side: Side;
  account: string;
  /** missing: 正解にあるのに無い、extra: 正解に無い、amount: 金額が違う、wrongSide: 反対側に書いた */
  type: 'missing' | 'extra' | 'amount' | 'wrongSide';
  expected?: number;
  actual?: number;
}

export interface JudgeResult {
  correct: boolean;
  kind: JudgeKind;
  balanced: boolean;
  issues: JudgeIssue[];
  /** 入力した行の表示用の印（キーは「dr:科目名」） */
  marks: Record<string, 'ok' | 'ng'>;
  /** 人が読む説明 */
  messages: string[];
}

/**
 * 仕訳を採点する（プログラムが判定し、AI には判定させない）。
 * 借方・貸方それぞれで、同じ勘定科目の金額をまとめてから比べる（行の順番・分け方は問わない）。
 * canonical で科目名をそろえる（別名「売掛」→「売掛金」など）。
 */
export function judgeJournal(
  expected: JournalLine[],
  actual: JournalLine[],
  canonical: (name: string) => string = (n) => n.trim(),
): JudgeResult {
  const norm = (lines: JournalLine[]) =>
    lines
      .filter((l) => l.account.trim() !== '' && l.amount !== 0)
      .map((l) => ({ ...l, account: canonical(l.account) }));
  const exp = norm(expected);
  const act = norm(actual);
  const t = totals(act);
  const balanced = t.dr === t.cr;

  if (act.length === 0) {
    return {
      correct: false,
      kind: 'empty',
      balanced,
      issues: [],
      marks: {},
      messages: ['仕訳を入力してください'],
    };
  }

  const issues: JudgeIssue[] = [];
  const marks: Record<string, 'ok' | 'ng'> = {};
  const sides: Side[] = ['dr', 'cr'];
  const expBy = { dr: sumByAccount(exp, 'dr'), cr: sumByAccount(exp, 'cr') };
  const actBy = { dr: sumByAccount(act, 'dr'), cr: sumByAccount(act, 'cr') };

  for (const side of sides) {
    const other: Side = side === 'dr' ? 'cr' : 'dr';
    for (const [account, amount] of actBy[side]) {
      const want = expBy[side].get(account);
      if (want === undefined) {
        const onOther = expBy[other].get(account);
        issues.push({
          side,
          account,
          type: onOther !== undefined ? 'wrongSide' : 'extra',
          actual: amount,
          expected: onOther,
        });
        marks[`${side}:${account}`] = 'ng';
      } else if (want !== amount) {
        issues.push({ side, account, type: 'amount', expected: want, actual: amount });
        marks[`${side}:${account}`] = 'ng';
      } else {
        marks[`${side}:${account}`] = 'ok';
      }
    }
    for (const [account, amount] of expBy[side]) {
      if (!actBy[side].has(account) && !actBy[other].has(account)) {
        issues.push({ side, account, type: 'missing', expected: amount });
      }
    }
  }

  const correct = issues.length === 0;
  let kind: JudgeKind;
  if (correct) kind = 'correct';
  else if (issues.every((i) => i.type === 'wrongSide')) kind = 'swapped';
  else if (!balanced) kind = 'unbalanced';
  else if (issues.some((i) => i.type === 'missing' || i.type === 'extra' || i.type === 'wrongSide'))
    kind = 'account';
  else kind = 'amount';

  const yen = (n?: number) => `${(n ?? 0).toLocaleString('ja-JP')} 円`;
  const messages: string[] = [];
  if (correct) messages.push('正解です。借方・貸方とも、勘定科目と金額が合っています');
  if (kind === 'swapped') messages.push('借方と貸方が逆になっています');
  if (!balanced)
    messages.push(`借方の合計（${yen(t.dr)}）と貸方の合計（${yen(t.cr)}）が一致していません`);
  // 科目を間違えたときは、正解の科目名を明かさないように伝える（答えを見るまで考えられるように）
  for (const i of issues) {
    const s = SIDE_LABELS[i.side];
    if (i.type === 'wrongSide')
      messages.push(
        `「${i.account}」は${s}ではなく、${SIDE_LABELS[i.side === 'dr' ? 'cr' : 'dr']}です`,
      );
    else if (i.type === 'extra') messages.push(`${s}の「${i.account}」は使いません`);
    else if (i.type === 'amount')
      messages.push(`${s}の「${i.account}」の金額が違います（入力: ${yen(i.actual)}）`);
  }
  const missing = issues.filter((i) => i.type === 'missing');
  for (const side of sides) {
    const n = missing.filter((i) => i.side === side).length;
    if (n > 0) messages.push(`${SIDE_LABELS[side]}に足りない科目が ${n} つあります`);
  }
  return { correct, kind, balanced, issues, marks, messages };
}
