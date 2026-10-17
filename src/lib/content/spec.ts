/**
 * 学習データの形式の説明（外部 AI に渡すプロンプトと、docs/CONTENT_FORMAT.md のもと）。
 * 形式（schema.ts）を変えたら、ここも直して `npm run docs` で文書を作り直す。
 */
import type { Account, Track } from './schema.ts';

export const LESSON_FORMAT = `## レッスンの形式（Markdown）

先頭に --- で囲んだ YAML（frontmatter）を書き、続けて本文を Markdown で書く。

\`\`\`
---
id: my-consumption-tax-invoice     # 英小文字・数字・ハイフン。「my-」で始める
title: インボイス制度のきほん
track: tax                          # 分野の id（下の一覧から選ぶ）
order: 1                            # 分野の中の並び順
level: 2                            # 1: 入門 2: 基礎 3: 標準（簿記 2 級程度）4: 応用 5: 発展
summary: 1〜2 文の要約
tags: [消費税, インボイス]
basis:                              # 根拠となる基準・法令（名前と、あれば公式の URL）
  - name: 消費税法
    url: https://www.nta.go.jp/...
asOf: '2026-10-01'                  # 内容の基準日（いつ時点の基準・法令に基づくか）
updated: '2026-10-01'               # 作成・更新した日
---

## 見出し（h2）

本文。### で小見出し（h3）。表（GFM）・箇条書き・太字が使える。
\`\`\`

### 本文で使える拡張

- 仕訳: コードブロックの言語を shiwake にする。1 行に「借方科目 金額 / 貸方科目 金額」。
  片側だけの行は「科目 金額 /」または「/ 科目 金額」。# で始まる行は取引の説明。空行で別の仕訳。

\`\`\`\`
\`\`\`shiwake
# 商品 100,000 円（税抜）を掛けで仕入れた
仕入 100,000 / 買掛金 110,000
仮払消費税等 10,000 /
\`\`\`
\`\`\`\`

- 確認問題: コードブロックの言語を quiz にして YAML で書く。選択問題（type: choice）と仕訳問題（type: shiwake）。

\`\`\`\`
\`\`\`quiz
type: choice
question: 問題文
choices: [選択肢A, 選択肢B, 選択肢C]
answer: 1                 # 正解の番号（0 から）
explanation: 解説
\`\`\`

\`\`\`quiz
type: shiwake
question: 取引の文
answer: |
  仕入 50,000 / 買掛金 50,000
hint: ヒント（任意）
explanation: 解説
\`\`\`
\`\`\`\`

- 囲み: 引用の 1 行目に [!POINT]（ポイント）・[!NOTE]（補足）・[!TIP]（コツ）・[!WARNING]（注意）

\`\`\`
> [!POINT]
> 資産 ＝ 負債 ＋ 純資産
\`\`\`
`;

export const DRILL_FORMAT = `## 問題セットの形式（JSON）

\`\`\`json
{
  "id": "my-invoice-drill",
  "title": "インボイスと仕入税額控除",
  "track": "tax",
  "order": 1,
  "level": 2,
  "summary": "1 文の説明",
  "tags": ["消費税"],
  "basis": [{ "name": "消費税法" }],
  "asOf": "2026-10-01",
  "updated": "2026-10-01",
  "questions": [
    {
      "id": "q1",
      "question": "商品 100,000 円（税抜）を仕入れ、消費税 10% とあわせて掛けとした。税抜経理による。",
      "answer": "仕入 100,000 / 買掛金 110,000\\n仮払消費税等 10,000 /",
      "hint": "支払った消費税は資産の科目で記録します（任意）",
      "explanation": "なぜその仕訳になるかの解説"
    }
  ]
}
\`\`\`

- answer は仕訳の書き方（1 行に「借方科目 金額 / 貸方科目 金額」、行は \\n で区切る）。正解の仕訳は 1 つ
- accounts（任意）: 選べる勘定科目の配列。省略するとアプリが正解の科目に間違えやすい科目を混ぜて作る
`;

export const COMMON_RULES = `## 守ること

- 日本の会計基準・税法（基準日の時点）に基づき、正確に書く。不確かなことは書かない
- 仕訳は借方の合計と貸方の合計を必ず一致させる。金額は円の整数（カンマ区切り可）
- 勘定科目は「使える勘定科目」の一覧にある名前だけを使う（一覧にない科目は使わない）
- basis（根拠）と asOf（基準日）を必ず書く。改正の多い分野（税金など）は特に、どの時点の制度かを明記する
- 出力は 1 つのファイルの中身だけにする（前後に説明を書かない）
`;

/** 分野の一覧（プロンプト用） */
export function tracksText(tracks: Track[]): string {
  return tracks.map((t) => `- ${t.id}: ${t.title}（${t.description}）`).join('\n');
}

/** 使える勘定科目の一覧（プロンプト用。区分ごと） */
export function accountsText(accounts: Account[]): string {
  const groups = new Map<string, string[]>();
  const label: Record<string, string> = {
    asset: '資産',
    liability: '負債',
    equity: '純資産',
    revenue: '収益',
    expense: '費用',
    other: 'その他',
  };
  for (const a of accounts) {
    const k = label[a.element];
    groups.set(k, [...(groups.get(k) ?? []), a.name]);
  }
  return [...groups].map(([k, names]) => `- ${k}: ${names.join('、')}`).join('\n');
}

/** docs/CONTENT_FORMAT.md の中身 */
export function contentFormatDoc(tracks: Track[], accounts: Account[]): string {
  return [
    '# 学習データの形式（外部 AI 向け）',
    '',
    '> このファイルは `npm run docs` で `src/lib/content/spec.ts` から作られます。手で編集しないでください。',
    '',
    'LLLM 経理の「外部 AI で作る」で作るプロンプトに含めている説明と同じです。',
    '`content/` に置く学習データ（レッスン・問題セット）もこの形式です（問題セットは YAML でも書けます）。',
    '',
    LESSON_FORMAT,
    DRILL_FORMAT,
    COMMON_RULES,
    '## 分野',
    '',
    tracksText(tracks),
    '',
    '## 使える勘定科目',
    '',
    accountsText(accounts),
    '',
  ].join('\n');
}
