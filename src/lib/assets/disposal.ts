/**
 * 固定資産の期中の売却（定額法・残存価額 0・月割り）。プログラムが計算する。
 */
import type { JournalEntry, JournalLine } from '../journal/types.ts';

export interface DisposalInput {
  /** 資産の科目（備品・車両運搬具など） */
  account: string;
  /** 取得原価 */
  cost: number;
  /** 耐用年数（年） */
  life: number;
  /** 期首までに償却した年数 */
  yearsUsed: number;
  /** 当期の期首から売却までの月数 */
  months: number;
  /** 売却額（代金は後で受け取る） */
  price: number;
}

export interface DisposalResult {
  /** 1 年分の減価償却費（1 円未満切り捨て） */
  annual: number;
  /** 期首の減価償却累計額 */
  accumulated: number;
  /** 当期の減価償却費（月割り） */
  current: number;
  /** 売却時の帳簿価額 */
  bookValue: number;
  /** 売却益（マイナスなら売却損） */
  gain: number;
  entry: JournalEntry;
  error?: string;
}

export function disposalEntry(input: DisposalInput): DisposalResult {
  const { account, cost, life, yearsUsed, months, price } = input;
  const ints = [cost, life, yearsUsed, months, price];
  const empty = {
    annual: 0,
    accumulated: 0,
    current: 0,
    bookValue: 0,
    gain: 0,
    entry: { lines: [] },
  };
  if (ints.some((n) => !Number.isInteger(n) || n < 0) || cost === 0 || life === 0)
    return {
      ...empty,
      error: '金額・年数・月数は 0 以上の整数で、取得原価と耐用年数は 1 以上にしてください',
    };
  if (months > 12) return { ...empty, error: '当期の月数は 12 以下にしてください' };
  if (yearsUsed * 12 + months > life * 12)
    return { ...empty, error: '使った期間が耐用年数を超えています' };
  const annual = Math.floor(cost / life);
  const accumulated = annual * yearsUsed;
  const current = Math.floor((annual * months) / 12);
  const bookValue = cost - accumulated - current;
  const gain = price - bookValue;
  const lines: JournalLine[] = [
    { side: 'dr', account: '減価償却累計額', amount: accumulated },
    { side: 'dr', account: '減価償却費', amount: current },
    { side: 'dr', account: '未収入金', amount: price },
    { side: 'cr', account, amount: cost },
  ];
  if (gain > 0) lines.push({ side: 'cr', account: '固定資産売却益', amount: gain });
  if (gain < 0) lines.push({ side: 'dr', account: '固定資産売却損', amount: -gain });
  return {
    annual,
    accumulated,
    current,
    bookValue,
    gain,
    entry: {
      caption: `${account}を ${price.toLocaleString('ja-JP')} 円で売却し、代金は後で受け取る（当期の ${months} か月分の減価償却費も計上）`,
      lines: lines.filter((l) => l.amount),
    },
  };
}
