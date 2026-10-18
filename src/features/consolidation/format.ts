import { formatAmount } from '@/lib/journal/amount';

/** 精算表の金額: 借方は そのまま、貸方は（ ）で囲む */
export function signed(n: number): string {
  if (n === 0) return '—';
  return n > 0 ? formatAmount(n) : `(${formatAmount(-n)})`;
}

/** レートの種類の説明 */
export const RATE_LABELS: Record<string, string> = {
  CR: '決算日レート（CR）',
  AR: '期中平均レート（AR）',
  HR: '取得時レート（HR）',
  HIST: '発生時のレート',
  JPY: '',
};

/** マイナスは △ で表す（開示の書き方） */
export function triangle(n: number): string {
  if (n === 0) return '—';
  return n < 0 ? `△${formatAmount(-n)}` : formatAmount(n);
}
