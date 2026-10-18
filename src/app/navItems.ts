import {
  BookOpenText,
  Boxes,
  Network,
  CircleHelp,
  House,
  NotebookPen,
  PenLine,
  Settings,
  Sparkles,
  Tags,
  Wand2,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** 短い説明（ホームのメニューなどで表示） */
  description?: string;
}

/**
 * メインのナビゲーション（スマホの下部ナビ・PC のサイドバー）。
 * ページを追加するときはここと App.tsx のルートに追加する。
 */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'ホーム', icon: House },
  {
    to: '/learn',
    label: '学ぶ',
    icon: BookOpenText,
    description: '簿記の基本から決算・税務まで、レッスンを読んで学ぶ',
  },
  {
    to: '/drill',
    label: '練習',
    icon: PenLine,
    description: '仕訳の問題を解いて、プログラムがその場で採点',
  },
  {
    to: '/ledger',
    label: '帳簿',
    icon: NotebookPen,
    description: '自分で仕訳を入れると、元帳・試算表・決算書ができあがる',
  },
  {
    to: '/chat',
    label: 'AI',
    icon: Sparkles,
    description: 'ブラウザの中で動く AI に質問・相談する',
  },
];

export const ACCOUNTS_ITEM: NavItem = {
  to: '/accounts',
  label: '勘定科目',
  icon: Tags,
  description: '勘定科目の意味・分類・使い方を調べる',
};
export const CONSOLIDATION_ITEM: NavItem = {
  to: '/consolidation',
  label: '連結',
  icon: Network,
  description: '親会社・子会社（海外も）の試算表から連結財務諸表を作り、内訳をたどる',
};
export const STUDIO_ITEM: NavItem = {
  to: '/studio',
  label: '外部 AI と連携',
  icon: Wand2,
  description: '外部の AI に教材を作ってもらって取り込む・難しい質問を聞く',
};
export const MODELS_ITEM: NavItem = { to: '/models', label: 'AI モデル', icon: Boxes };
export const SETTINGS_ITEM: NavItem = { to: '/settings', label: '設定', icon: Settings };
export const HELP_ITEM: NavItem = { to: '/help', label: 'ヘルプ', icon: CircleHelp };

/** PC のサイドバー下部 */
export const SUB_NAV_ITEMS: NavItem[] = [
  CONSOLIDATION_ITEM,
  ACCOUNTS_ITEM,
  STUDIO_ITEM,
  MODELS_ITEM,
  SETTINGS_ITEM,
  HELP_ITEM,
];

/** スマホの下部ナビ（メイン＋設定） */
export const BOTTOM_NAV_ITEMS: NavItem[] = [...NAV_ITEMS, SETTINGS_ITEM];

export function isActivePath(location: string, to: string): boolean {
  return to === '/' ? location === '/' : location === to || location.startsWith(`${to}/`);
}
