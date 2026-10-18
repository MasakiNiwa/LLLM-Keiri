import {
  BookOpenText,
  Bot,
  Boxes,
  CalendarCheck,
  CalendarDays,
  CircleHelp,
  House,
  LayoutGrid,
  Network,
  NotebookPen,
  PenLine,
  RotateCcw,
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
  /** 短い説明（メニュー・ホームで表示） */
  description?: string;
  /** 検索で引っかける言葉（メニューの検索・コマンドパレット） */
  keywords?: string;
  /** 下部ナビでの短い名前 */
  shortLabel?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const HOME_ITEM: NavItem = { to: '/', label: 'ホーム', icon: House };
export const LEARN_ITEM: NavItem = {
  to: '/learn',
  label: '学ぶ',
  icon: BookOpenText,
  description: '簿記の基本から決算・税務・連結・原価計算まで、レッスンを読んで学ぶ',
  keywords: 'レッスン 教材 検索 用語',
};
export const ACCOUNTS_ITEM: NavItem = {
  to: '/accounts',
  label: '勘定科目',
  icon: Tags,
  description: '勘定科目の意味・分類・使い方を調べる',
  keywords: '科目 一覧 辞書',
};
export const DRILL_ITEM: NavItem = {
  to: '/drill',
  label: '練習',
  icon: PenLine,
  description: '仕訳の問題と決算の総合演習を解いて、プログラムがその場で採点',
  keywords: '問題 ドリル 演習 精算表 採点',
};
export const REVIEW_ITEM: NavItem = {
  to: '/review',
  label: '今日の復習',
  icon: RotateCcw,
  description: '間違えた問題・忘れかけた問題を、ちょうどよい間隔で解き直す',
  keywords: '復習 FSRS 忘却曲線',
};
export const LOG_ITEM: NavItem = {
  to: '/log',
  label: '記録',
  icon: CalendarCheck,
  description: '何日に何を学んだかをカレンダーで振り返る。連続学習日数も',
  keywords: '学習の記録 カレンダー 履歴 連続',
};
export const LEDGER_ITEM: NavItem = {
  to: '/ledger',
  label: '帳簿',
  icon: NotebookPen,
  description: '自分で仕訳を入れると、元帳・試算表・決算書・CF・分析ができあがる',
  keywords: '仕訳帳 元帳 試算表 決算書 キャッシュ・フロー 財務分析 サンプル',
};
export const CONSOLIDATION_ITEM: NavItem = {
  to: '/consolidation',
  label: '連結',
  icon: Network,
  description: '親会社・子会社（海外も）の試算表から連結財務諸表を作り、内訳をたどる',
  keywords: '連結決算 子会社 為替 セグメント 精算表',
};
export const CALENDAR_ITEM: NavItem = {
  to: '/calendar',
  label: '経理カレンダー',
  icon: CalendarDays,
  description: '決算月から、申告・納付・給与・社会保険の主な期限を計算する（祝日対応）',
  keywords: '期限 スケジュール 申告 納付 年末調整',
};
export const AI_ITEM: NavItem = {
  to: '/ai',
  label: 'AI 練習',
  shortLabel: 'AI',
  icon: Bot,
  description: 'AI に質問・AI が監査人や税理士の役になって相手をする練習',
  keywords: 'AI 練習 ロールプレイ 監査人 税理士 社長 報告 説明 クイズ',
};
export const CHAT_ITEM: NavItem = {
  to: '/chat',
  label: 'AI に質問',
  icon: Sparkles,
  description: 'ブラウザの中で動く AI に質問・相談する',
  keywords: 'AI チャット 相談 質問',
};
export const STUDIO_ITEM: NavItem = {
  to: '/studio',
  label: '外部 AI と連携',
  icon: Wand2,
  description: '外部の AI に教材を作ってもらって取り込む・難しい質問を聞く。マイ教材',
  keywords: 'プロンプト マイ教材 取り込み ChatGPT Claude Gemini',
};
export const MODELS_ITEM: NavItem = {
  to: '/models',
  label: 'AI モデル',
  icon: Boxes,
  description: 'AI モデルのダウンロード・読み込み・バックアップ',
  keywords: 'モデル Gemma ダウンロード',
};
export const SETTINGS_ITEM: NavItem = {
  to: '/settings',
  label: '設定',
  icon: Settings,
  description: '表示・AI・読み上げ・データ（バックアップと復元）',
  keywords: 'ダークモード 文字の大きさ バックアップ 復元 読み上げ',
};
export const HELP_ITEM: NavItem = {
  to: '/help',
  label: 'ヘルプ',
  icon: CircleHelp,
  description: '使い方・よくある質問・クレジットとライセンス',
  keywords: '使い方 FAQ ライセンス',
};
export const MENU_ITEM: NavItem = {
  to: '/menu',
  label: 'メニュー',
  icon: LayoutGrid,
  description: 'すべての機能',
};

/**
 * すべての機能（メニュー・PC のサイドバー・コマンドパレットのもと）。
 * ページを追加するときはここと App.tsx のルートに追加する。
 */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'learn', label: '学ぶ', items: [LEARN_ITEM, ACCOUNTS_ITEM] },
  { id: 'practice', label: '練習・記録', items: [DRILL_ITEM, REVIEW_ITEM, LOG_ITEM] },
  { id: 'tools', label: '実務ツール', items: [LEDGER_ITEM, CONSOLIDATION_ITEM, CALENDAR_ITEM] },
  { id: 'ai', label: 'AI', items: [AI_ITEM, CHAT_ITEM, STUDIO_ITEM, MODELS_ITEM] },
  { id: 'app', label: 'アプリ', items: [SETTINGS_ITEM, HELP_ITEM] },
];

export const ALL_FEATURES: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

/** スマホの下部ナビ（7 つまで。ほかの機能は「メニュー」から） */
export const BOTTOM_NAV_ITEMS: NavItem[] = [
  HOME_ITEM,
  LEARN_ITEM,
  DRILL_ITEM,
  AI_ITEM,
  LOG_ITEM,
  SETTINGS_ITEM,
  MENU_ITEM,
];

export function isActivePath(location: string, to: string): boolean {
  return to === '/' ? location === '/' : location === to || location.startsWith(`${to}/`);
}

/** 下部ナビでどれを選択中にするか（下部ナビにない機能のページでは「メニュー」） */
export function activeBottomItem(location: string): string {
  const direct = BOTTOM_NAV_ITEMS.find((i) => i !== MENU_ITEM && isActivePath(location, i.to));
  if (direct) return direct.to;
  // 演習・選択問題は「練習」の一部
  if (location.startsWith('/exercise/') || location.startsWith('/quiz/')) return DRILL_ITEM.to;
  // 学習対象ごとの履歴は「記録」の一部
  if (location.startsWith('/history/')) return LOG_ITEM.to;
  // AI に質問・外部 AI・モデルは「AI」の一部
  if ([CHAT_ITEM, STUDIO_ITEM, MODELS_ITEM].some((i) => isActivePath(location, i.to)))
    return AI_ITEM.to;
  return MENU_ITEM.to;
}
