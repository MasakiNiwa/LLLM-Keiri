import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { BackendKind, ConversationSettings } from '@/lib/llm/types';

export type ThemeSetting = 'system' | 'light' | 'dark';
/** ダークモードの配色。neutral: 色味のないグレー、warm: 暖かいグレー、vivid: 鮮やかな配色 */
export type DarkPalette = 'neutral' | 'warm' | 'vivid';

/** auto: WebGPU が使えれば GPU（Artisan）、使えなければ CPU */
export type BackendSetting = 'auto' | BackendKind;

/** 問題を解いたときのひとこと。template: アプリが用意した言葉（モデル不要）、llm: AI が考える */
export type ReactionMode = 'off' | 'template' | 'llm';

/** ユーザーの立場（任意。AI の説明の深さや例の選び方の参考にする） */
export type UserRole = '' | 'student' | 'beginner' | 'staff' | 'owner' | 'exam';

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
export interface Settings extends Omit<ConversationSettings, 'systemPrompt'> {
  // ---- AI ----
  persona: string;
  /** persona = 'custom' のときの性格の説明 */
  customPersona: string;
  userRole: UserRole;
  /** ユーザーが追加する指示（システムプロンプトの末尾に付ける） */
  extraInstructions: string;
  reaction: ReactionMode;
  /** AI にアプリの状態（見ているページ・問題・帳簿など）を伝える */
  shareAppState: boolean;
  /** AI にツール（勘定科目の検索・仕訳の検証など）を使わせる */
  useTools: boolean;
  /** 画面の右下に AI の解説ボタンを出す */
  showAiButton: boolean;
  /** タスクごとに温度を変える（判定・下書きは低く） */
  taskTemperature: boolean;
  /** 単発の生成（解説・ひとことなど）のあとも、チャットの文脈（KV キャッシュ）を残す（実験的） */
  keepChatContext: boolean;
  // ---- エンジン（変更後はモデルの再読み込みが必要） ----
  backend: BackendSetting;
  maxNumTokens: number;
  // ---- モデル管理 ----
  saveImportedModels: boolean;
  autoLoadLastModel: boolean;
  lastModelName: string | null;
  /** 自動設定時に、フォールバックで読み込めたバックエンドをモデルごとに覚えておく */
  backendHints: Record<string, BackendKind>;
  // ---- 表示・操作 ----
  theme: ThemeSetting;
  darkPalette: DarkPalette;
  fontScale: FontScale;
  enterToSend: boolean;
  showStats: boolean;
  // ---- 経理カレンダー ----
  /** 決算月（1〜12） */
  closingMonth: number;
  /** 源泉所得税の納期の特例を受けている */
  specialWithholding: boolean;
  // ---- 復習 ----
  /** 1 日の復習の目標の数（0 は目標なし）。目標を超えても続けて復習できる */
  reviewGoal: number;
  // ---- 読み上げ ----
  /** AI の返事が終わったら自動で読み上げる */
  autoSpeak: boolean;
  /** 読み上げの速さ（0.5〜2） */
  speechRate: number;
  // ---- はじめての案内 ----
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  persona: 'senpai',
  customPersona: '',
  userRole: '',
  extraInstructions: '',
  reaction: 'llm',
  shareAppState: true,
  useTools: true,
  showAiButton: true,
  taskTemperature: true,
  keepChatContext: true,

  temperature: 1.0,
  topK: 64,
  topP: 0.95,
  maxOutputTokens: 1024,
  enableThinking: false,

  backend: 'auto',
  maxNumTokens: 4096,

  saveImportedModels: true,
  autoLoadLastModel: true,
  lastModelName: null,
  backendHints: {},

  theme: 'system',
  darkPalette: 'neutral',
  fontScale: 'md',
  enterToSend: true,
  showStats: true,

  closingMonth: 3,
  specialWithholding: false,

  reviewGoal: 30,

  autoSpeak: false,
  speechRate: 1.1,

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
      // 前回のモデル名などはリセット対象外（自動読み込みのため）
      reset: () =>
        set((s) => ({
          ...DEFAULT_SETTINGS,
          lastModelName: s.lastModelName,
          backendHints: s.backendHints,
          onboarded: s.onboarded,
        })),
    }),
    {
      name: `${STORAGE_PREFIX}:settings`,
      version: 1,
      partialize: ({ update: _u, reset: _r, ...rest }) => rest,
    },
  ),
);
