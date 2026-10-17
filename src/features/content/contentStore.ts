import { create } from 'zustand';
import { AccountBook } from '@/lib/content/accounts';
import { fetchContentIndex } from '@/lib/content/load';
import type { ContentIndex } from '@/lib/content/schema';
import { errorMessage } from '@/lib/utils/format';

interface ContentState {
  index: ContentIndex | null;
  book: AccountBook | null;
  error: string | null;
  load: () => Promise<void>;
}

/** 学習データの一覧（分野・レッスン・問題セット・勘定科目・ルール） */
export const useContent = create<ContentState>()((set, get) => ({
  index: null,
  book: null,
  error: null,
  load: async () => {
    if (get().index) return;
    try {
      const index = await fetchContentIndex();
      set({ index, book: new AccountBook(index.accounts), error: null });
    } catch (e) {
      set({ error: errorMessage(e) });
    }
  },
}));

/** 学習データの一覧を使う（まだなら読み込む） */
export function useContentIndex() {
  const index = useContent((s) => s.index);
  const error = useContent((s) => s.error);
  if (!index && !error) void useContent.getState().load();
  return { index, error };
}
