import type { BackendKind } from '@/lib/llm/types';
import type {
  BackendSetting,
  DarkPalette,
  ReactionMode,
  ThemeSetting,
  UserRole,
} from './settingsStore';

export const BACKEND_LABELS: Record<BackendKind, string> = {
  'gpu-artisan': 'GPU（Artisan）',
  gpu: 'GPU',
  cpu: 'CPU',
};

export const BACKEND_SETTING_LABELS: Record<BackendSetting, string> = {
  auto: '自動（推奨）',
  ...BACKEND_LABELS,
};

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

export const REACTION_LABELS: Record<ReactionMode, string> = {
  off: 'なし',
  template: '決まったひとこと（モデル不要）',
  llm: 'AI が考える（モデルがないときは決まったひとこと）',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  '': '指定しない',
  student: '学生',
  beginner: '経理の初心者・これから経理の仕事をする',
  staff: '経理の仕事をしている',
  owner: '経営者・個人事業主',
  exam: '簿記・会計の資格試験を目指している',
};
