/// <reference lib="webworker" />
import * as Comlink from 'comlink';
import MiniSearch from 'minisearch';
import type { SearchDoc } from '@/lib/content/schema';
import { tokenize } from './tokenize';

export interface SearchHit {
  id: string;
  kind: SearchDoc['kind'];
  title: string;
  track?: string;
  score: number;
  /** 本文の中の、検索語のまわりの抜き出し */
  snippet: string;
}

let index: MiniSearch<SearchDoc> | null = null;
const docs = new Map<string, SearchDoc>();

function snippet(text: string, query: string): string {
  const terms = query.normalize('NFKC').toLowerCase().split(/\s+/).filter(Boolean);
  const lower = text.normalize('NFKC').toLowerCase();
  let pos = -1;
  for (const t of terms) {
    pos = lower.indexOf(t);
    if (pos >= 0) break;
  }
  if (pos < 0) return text.slice(0, 80);
  const start = Math.max(0, pos - 30);
  return `${start > 0 ? '…' : ''}${text.slice(start, start + 90)}…`;
}

const api = {
  /** 索引を作る（学習データが変わったら作り直す） */
  build(all: SearchDoc[]): number {
    docs.clear();
    for (const d of all) docs.set(d.id, d);
    index = new MiniSearch<SearchDoc>({
      fields: ['title', 'text'],
      storeFields: ['kind', 'title', 'track'],
      tokenize,
      searchOptions: { boost: { title: 3 }, combineWith: 'AND' },
    });
    index.addAll(all);
    return all.length;
  },
  search(query: string, limit = 30): SearchHit[] {
    if (!index || query.trim() === '') return [];
    return index
      .search(query)
      .slice(0, limit)
      .map((r) => {
        const d = docs.get(String(r.id))!;
        return {
          id: d.id,
          kind: d.kind,
          title: d.title,
          track: d.track,
          score: r.score,
          snippet: snippet(d.text, query),
        };
      });
  },
};

export type SearchApi = typeof api;

Comlink.expose(api);
