/** 借方（debit）・貸方（credit） */
export type Side = 'dr' | 'cr';

export const SIDE_LABELS: Record<Side, string> = { dr: '借方', cr: '貸方' };

/** 仕訳の 1 行（片側の 1 科目） */
export interface JournalLine {
  side: Side;
  account: string;
  /** 金額（円・整数） */
  amount: number;
}

/** 仕訳 1 件 */
export interface JournalEntry {
  /** 取引の説明（` ```shiwake ` の `#` の行） */
  caption?: string;
  lines: JournalLine[];
}
