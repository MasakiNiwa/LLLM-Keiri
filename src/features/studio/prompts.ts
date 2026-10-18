/**
 * 外部の AI（ChatGPT・Claude・Gemini など）に渡すプロンプトを作る。
 * 形式の説明・使える勘定科目・分野の一覧を含めるので、返ってきたものはそのまま取り込める。
 */
import { today } from '@/lib/content/rules';
import type { ContentIndex } from '@/lib/content/schema';
import {
  accountsText,
  COMMON_RULES,
  CONSOLIDATION_FORMAT,
  DRILL_FORMAT,
  LESSON_FORMAT,
  tracksText,
} from '@/lib/content/spec';
import { LEVEL_LABELS } from '@/features/learn/meta';

export interface MakeOptions {
  kind: 'lesson' | 'drill' | 'consolidation';
  topic: string;
  track: string;
  level: number;
  /** 問題の数（問題セット） */
  count: number;
  notes: string;
}

export function buildMakePrompt(o: MakeOptions, index: ContentIndex): string {
  const track = index.tracks.find((t) => t.id === o.track);
  const site = 'LLLM 経理（日本の経理・簿記を学ぶサイト）';
  const what =
    o.kind === 'lesson'
      ? `${site}のレッスンを 1 つ`
      : o.kind === 'drill'
        ? `${site}の仕訳問題のセットを 1 つ（${o.count} 問）`
        : `${site}の連結の事例（親会社と子会社の試算表と、連結修正仕訳）を 1 つ`;
  const size =
    o.kind === 'lesson'
      ? '- 分量: 2,000〜4,000 字程度。見出し（##）を 3〜5 個。仕訳の例を入れ、最後に確認問題を 2〜3 問（うち 1 問以上は仕訳問題）'
      : o.kind === 'drill'
        ? `- 問題数: ${o.count} 問。易しい順に並べ、間違えやすい取引も混ぜる。各問に解説を付ける`
        : '- 規模: 親会社 1 社と子会社 1〜2 社。各社の試算表は 8〜15 科目。連結修正仕訳は 3〜8 個（投資と資本の相殺消去を必ず含める）。各社の note に前提（取得の時期・取得原価・取得時の資本・グループ内の取引）を書き、修正仕訳の question だけを読んでも解けるように数字をそろえる';
  return [
    'あなたは日本の経理・簿記の教材を作る専門家です。',
    `次の条件で、${what}作ってください。形式は後に書いた仕様に厳密に従ってください。`,
    '',
    '## 条件',
    '',
    `- テーマ: ${o.topic.trim() || '（おまかせ）'}`,
    `- 分野: ${o.track}（${track?.title ?? ''}）`,
    `- レベル: ${o.level}（${LEVEL_LABELS[o.level] ?? ''}）`,
    size,
    `- 基準日（asOf・updated）: ${today()}`,
    o.notes.trim() ? `- そのほかの要望: ${o.notes.trim()}` : '',
    '',
    o.kind === 'lesson' ? LESSON_FORMAT : o.kind === 'drill' ? DRILL_FORMAT : CONSOLIDATION_FORMAT,
    COMMON_RULES,
    '## 分野',
    '',
    tracksText(index.tracks),
    '',
    '## 使える勘定科目',
    '',
    accountsText(index.accounts),
    '',
    o.kind === 'lesson'
      ? '出力: frontmatter（---）から始まる Markdown のファイルの中身だけ'
      : '出力: JSON だけ（コードブロックで囲んでもよい）',
  ]
    .filter((l) => l !== '')
    .join('\n')
    .replace(/\n(## )/g, '\n\n$1');
}

/**
 * ローカル AI では難しい質問を、アプリの状態を添えて外部 AI に聞くためのプロンプト。
 */
export function buildAskPrompt(question: string, appStateJson: string): string {
  return [
    'あなたは日本の経理・簿記・会計基準・税法にくわしい先生です。',
    '私は経理の学習サイト「LLLM 経理」で学んでいます。下の <app_state> は、いま見ている画面の内容を学習サイトが JSON にしたものです（レッスンの本文・問題と採点結果・帳簿の残高など）。',
    'これをふまえて、質問に日本語で答えてください。',
    '',
    '- 仕訳は「借方科目 金額 / 貸方科目 金額」の形で書く',
    '- 根拠となる会計基準・法令があれば名前を挙げ、いつ時点の制度かを明記する（改正が多い分野は特に）',
    '- 分からないことは推測で断定しない',
    '',
    appStateJson,
    '',
    `## 質問`,
    question.trim(),
  ].join('\n');
}
