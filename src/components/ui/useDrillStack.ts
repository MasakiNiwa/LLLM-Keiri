import { useCallback, useState } from 'react';

/**
 * ドリルダウンの履歴（決算書 → 勘定 → 仕訳 のように、たどった順に積む）。
 * 戻るで 1 つ前へ、閉じるですべて消す。
 */
export function useDrillStack<T>() {
  const [stack, setStack] = useState<T[]>([]);
  const push = useCallback((item: T) => setStack((s) => [...s, item]), []);
  /** 最初から開き直す（一覧から押したとき） */
  const open = useCallback((item: T) => setStack([item]), []);
  const back = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const close = useCallback(() => setStack([]), []);
  return { stack, top: stack.at(-1), push, open, back, close };
}
