/**
 * 学習データ（content/）の形式。ビルド時の検証（build/content.ts）とアプリの読み込みで共通に使う。
 * 外部 AI で作ったデータの取り込み（フェーズ 4）もこの形式に合わせる。
 *
 * ※ Node から直接読み込むため、このファイルからの import は拡張子付きの相対パスにする。
 */
import { z } from 'zod';

/** 勘定科目の区分（5 要素＋その他） */
export const ELEMENTS = ['asset', 'liability', 'equity', 'revenue', 'expense', 'other'] as const;
export type Element = (typeof ELEMENTS)[number];

export const ELEMENT_LABELS: Record<Element, string> = {
  asset: '資産',
  liability: '負債',
  equity: '純資産',
  revenue: '収益',
  expense: '費用',
  other: 'その他',
};

/** 増えるときに記入する側（その他は決まっていない） */
export const ELEMENT_INCREASE_SIDE: Record<Element, 'dr' | 'cr' | null> = {
  asset: 'dr',
  liability: 'cr',
  equity: 'cr',
  revenue: 'cr',
  expense: 'dr',
  other: null,
};

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付は YYYY-MM-DD で書きます');
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id は英小文字・数字・ハイフンで書きます');
/** 難しさ（1: 入門 〜 5: 上級。目安: 1〜2 簿記 3 級、3 簿記 2 級、4〜5 実務・会計基準） */
const level = z.number().int().min(1).max(5);

export const BasisSchema = z.object({
  /** 根拠となる基準・法令・資料の名前（例: 企業会計原則、消費税法） */
  name: z.string().min(1),
  url: z.url().optional(),
  note: z.string().optional(),
});
export type Basis = z.infer<typeof BasisSchema>;

export const ChangeSchema = z.object({ date, note: z.string().min(1) });

export const TrackSchema = z.object({
  id,
  title: z.string().min(1),
  description: z.string().min(1),
  /** 表示用のアイコン名（lucide のアイコン。src/features/learn/trackIcons.ts にあるもの） */
  icon: z.string().optional(),
});
export type Track = z.infer<typeof TrackSchema>;

export const AccountSchema = z.object({
  name: z.string().min(1),
  kana: z.string().min(1),
  element: z.enum(ELEMENTS),
  /** 表示区分（例: 流動資産、販売費及び一般管理費） */
  group: z.string().min(1),
  /** 評価勘定（減価償却累計額・貸倒引当金など）。区分とは逆の側で増える */
  contra: z.boolean().default(false),
  /** 同じ意味で受け付ける書き方（例: 売掛 → 売掛金） */
  aliases: z.array(z.string().min(1)).default([]),
  description: z.string().min(1),
  /** どんなときに使うか */
  usage: z.string().optional(),
  /** 仕訳の例（仕訳の書き方。` ```shiwake ` と同じ） */
  examples: z.array(z.string().min(1)).default([]),
  related: z.array(z.string().min(1)).default([]),
  level: level.default(1),
});
export type Account = z.infer<typeof AccountSchema>;

/** 勘定科目が増えるときに記入する側 */
export function increaseSide(a: Pick<Account, 'element' | 'contra'>): 'dr' | 'cr' | null {
  const side = ELEMENT_INCREASE_SIDE[a.element];
  if (!side || !a.contra) return side;
  return side === 'dr' ? 'cr' : 'dr';
}

export const RuleSchema = z.object({
  id,
  title: z.string().min(1),
  unit: z.enum(['percent', 'yen']),
  description: z.string().optional(),
  basis: z.array(BasisSchema).default([]),
  /** 期間ごとの値（from 以降、to まで。to が無ければ現在も適用） */
  values: z
    .array(
      z.object({ from: date, to: date.optional(), value: z.number(), note: z.string().optional() }),
    )
    .min(1),
});
export type Rule = z.infer<typeof RuleSchema>;

/** レッスンと問題セットに共通の情報 */
const contentMeta = {
  id,
  title: z.string().min(1),
  track: id,
  /** 分野の中の並び順（小さいほど先） */
  order: z.number(),
  level,
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
  /** 根拠となる基準・法令 */
  basis: z.array(BasisSchema).default([]),
  /** 内容の基準日（いつ時点の基準・法令に基づくか） */
  asOf: date,
  /** 最後に内容を更新した日 */
  updated: date,
  changes: z.array(ChangeSchema).default([]),
};

export const LessonFrontmatterSchema = z.object(contentMeta);
export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;

export interface Heading {
  /** 見出しの id（sec-1, sec-2, …。本文の h2・h3 の順） */
  id: string;
  depth: 2 | 3;
  text: string;
}

export interface LessonMeta extends LessonFrontmatter {
  headings: Heading[];
  /** 読むのにかかる目安（分） */
  minutes: number;
  /** 確認問題の数 */
  quizCount: number;
}

export interface Lesson {
  meta: LessonMeta;
  /** 本文（Markdown。` ```quiz ` の中身は JSON に変換済み） */
  body: string;
}

/** 選択問題 */
export const ChoiceQuizSchema = z.object({
  type: z.literal('choice'),
  question: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2),
  /** 正解の選択肢の番号（0 から） */
  answer: z.number().int().min(0),
  explanation: z.string().optional(),
});

/** 仕訳問題 */
export const ShiwakeQuestionSchema = z.object({
  question: z.string().min(1),
  /** 正解の仕訳（仕訳の書き方） */
  answer: z.string().min(1),
  /** 選べる勘定科目（無ければ正解の科目と、よく間違える科目からアプリが選ぶ） */
  accounts: z.array(z.string().min(1)).optional(),
  hint: z.string().optional(),
  explanation: z.string().optional(),
});
export type ShiwakeQuestion = z.infer<typeof ShiwakeQuestionSchema>;

export const ShiwakeQuizSchema = ShiwakeQuestionSchema.extend({ type: z.literal('shiwake') });

export const QuizSchema = z.discriminatedUnion('type', [ChoiceQuizSchema, ShiwakeQuizSchema]);
export type Quiz = z.infer<typeof QuizSchema>;

export const DrillQuestionSchema = ShiwakeQuestionSchema.extend({ id: z.string().min(1) });
export type DrillQuestion = z.infer<typeof DrillQuestionSchema>;

export const DrillSetSchema = z.object({
  ...contentMeta,
  questions: z.array(DrillQuestionSchema).min(1),
});
export type DrillSet = z.infer<typeof DrillSetSchema>;
export type DrillMeta = Omit<DrillSet, 'questions'> & { questionCount: number };

/** content/index.json（一覧に必要なものだけ。本文は別ファイル） */
export interface ContentIndex {
  version: 1;
  tracks: Track[];
  lessons: LessonMeta[];
  drills: DrillMeta[];
  accounts: Account[];
  rules: Rule[];
}

/** 検索の対象（content/search.json） */
export interface SearchDoc {
  /** lesson:<id> / drill:<id> / account:<科目名> */
  id: string;
  kind: 'lesson' | 'drill' | 'account';
  title: string;
  track?: string;
  text: string;
}
