import { create } from 'zustand';

/** コマンドパレット（すべての機能と学習データを探して開く）の開閉 */
export const useCommand = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
