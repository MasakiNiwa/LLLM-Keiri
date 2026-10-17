import * as Comlink from 'comlink';
import { fetchSearchDocs } from '@/lib/content/load';
import type { SearchApi, SearchHit } from './search.worker';

export type { SearchHit };

let remote: Comlink.Remote<SearchApi> | null = null;
let ready: Promise<void> | null = null;

/**
 * 全文検索（Web Worker の中で索引を作って検索する。画面は止まらない）。
 * 初めて使うときに検索用のデータを読み込み、索引を作る。
 */
function ensureReady(): Promise<void> {
  if (!ready) {
    const worker = new Worker(new URL('./search.worker.ts', import.meta.url), {
      type: 'module',
      name: 'search',
    });
    remote = Comlink.wrap<SearchApi>(worker);
    ready = fetchSearchDocs()
      .then((docs) => remote!.build(docs))
      .then(() => undefined)
      .catch((e) => {
        ready = null;
        worker.terminate();
        throw e;
      });
  }
  return ready;
}

export async function searchContent(query: string, limit?: number): Promise<SearchHit[]> {
  await ensureReady();
  return remote!.search(query, limit);
}

/** 先に索引を作っておく（検索欄を開いたときなど） */
export function warmupSearch(): void {
  ensureReady().catch((e) => console.warn('検索の準備に失敗しました', e));
}
