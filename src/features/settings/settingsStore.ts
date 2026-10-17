import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_PREFIX } from '@/lib/constants';

export type ThemeSetting = 'system' | 'light' | 'dark';
/** ダークモードの配色。neutral: 色味のないグレー、warm: 暖かいグレー、vivid: 鮮やかな配色 */
export type DarkPalette = 'neutral' | 'warm' | 'vivid';

/** 学習ページの本文の文字の大きさ */
export type FontScale = 'sm' | 'md' | 'lg' | 'xl';
export const FONT_SCALES: Record<FontScale, { label: string; zoom: number }> = {
  sm: { label: '小', zoom: 0.9 },
  md: { label: '標準', zoom: 1 },
  lg: { label: '大', zoom: 1.12 },
  xl: { label: '特大', zoom: 1.25 },
};

/**
 * 設定。項目を増やすときは DEFAULT_SETTINGS に既定値を足すだけでよい
 * （保存済みの設定に無い項目は既定値で補われる）。
 */
export interface Settings {
  // ---- 表示・操作 ----
  theme: ThemeSetting;
  darkPalette: DarkPalette;
  fontScale: FontScale;
  // ---- はじめての案内 ----
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  darkPalette: 'neutral',
  fontScale: 'md',
  onboarded: false,
};

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set((s) => ({ ...DEFAULT_SETTINGS, onboarded: s.onboarded })),
    }),
    {
      name: `${STORAGE_PREFIX}:settings`,
      version: 1,
      partialize: ({ update: _u, reset: _r, ...rest }) => rest,
    },
  ),
);
