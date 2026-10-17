import type { DarkPalette, ThemeSetting } from './settingsStore';

export const THEME_LABELS: Record<ThemeSetting, string> = {
  system: 'システムに合わせる',
  light: 'ライト',
  dark: 'ダーク',
};

export const DARK_PALETTE_LABELS: Record<DarkPalette, { label: string; hint: string }> = {
  neutral: {
    label: '落ち着いたグレー',
    hint: '色味のないグレーと、くすんだ青緑。いちばん目にやさしい',
  },
  warm: { label: 'あたたかいグレー', hint: 'ほんのり暖かいグレーと、くすんだテラコッタ' },
  vivid: { label: '鮮やか', hint: '濃紺の背景と鮮やかな色' },
};
