import { create } from 'zustand';

/** フロートの解説パネルの開閉（どの画面からでも開ける） */
export const useAiPanel = create<{ open: boolean; setOpen: (open: boolean) => void }>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
