import { useEffect, useState } from 'react';
import { searchContent, type SearchHit } from '@/lib/search/client';
import { errorMessage } from '@/lib/utils/format';

interface Result {
  query: string;
  hits?: SearchHit[];
  error?: string;
}

/** 入力が止まってから検索する（Web Worker で検索）。hits が null の間は検索中 */
export function useSearch(query: string, delay = 200) {
  const q = query.trim();
  const [result, setResult] = useState<Result>({ query: '' });
  useEffect(() => {
    if (!q) return;
    let stale = false;
    const t = setTimeout(() => {
      searchContent(q).then(
        // 古い検索語の結果は反映しない
        (hits) => !stale && setResult({ query: q, hits }),
        (e) => !stale && setResult({ query: q, error: errorMessage(e) }),
      );
    }, delay);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [q, delay]);
  const current = result.query === q;
  return {
    hits: current ? (result.hits ?? null) : null,
    error: current ? (result.error ?? null) : null,
  };
}
