import { create } from 'zustand';

/** 勘定科目の説明シート（どの画面からでも科目名を押すと開く） */
export const useAccountSheet = create<{
  name: string | null;
  open: (name: string) => void;
  close: () => void;
}>()((set) => ({
  name: null,
  open: (name) => set({ name }),
  close: () => set({ name: null }),
}));
