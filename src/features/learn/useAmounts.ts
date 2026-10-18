import { useState } from 'react';
import { formatAmount, parseAmount } from '@/lib/journal/amount';

/** 入力した金額の文字列を数値にする（読めなければ NaN） */
export const amount = (s: string) => parseAmount(s) ?? NaN;

export function useAmounts<K extends string>(initial: Record<K, number>) {
  const toText = () =>
    Object.fromEntries(
      Object.entries(initial).map(([k, v]) => [k, formatAmount(v as number)]),
    ) as Record<K, string>;
  const [values, setValues] = useState(toText);
  return {
    values,
    set: (k: K) => (v: string) => setValues((s) => ({ ...s, [k]: v })),
    reset: () => setValues(toText()),
  };
}
