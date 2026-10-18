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

- 計算の部品: コードブロックの言語を widget にして YAML で書く。数字を変えるとアプリが仕訳を作り直す。
  type: payroll（給料の仕訳。gross・incomeTax・residentTax・socialInsurance）、type: collection（入金消込。billed・received）、type: withholding（報酬の源泉徴収。fee・consumptionTax）、type: tax-settlement（決算の消費税の精算。received・paid）、type: asset-disposal（固定資産の期中の売却。cost・life・yearsUsed・months・price）、type: points（ポイントへの配分。price・points・usageRate）、type: impairment（減損。bookValue・undiscounted・netSellingPrice・valueInUse）、type: lease（新しいリース会計基準。payment・years・rate）、type: process-costing（総合原価計算）、type: overhead（製造間接費の差異）、type: standard-cost（直接材料費の差異）、type: cvp（損益分岐点。sales・variableCosts・fixedCosts・targetProfit）、type: deficiency（内部統制の不備の評価。pretaxIncome・potentialMisstatement）、type: beppyo4（法人税の所得の計算）、type: payroll-month（1 か月分の給与計算）、type: year-end（年末調整。2025 年分のルール）、type: working-capital（運転資金と CCC）、type: cash-plan（資金繰り表）、type: sales-variance（売上高の価格差異・数量差異。budgetPrice・budgetQuantity・actualPrice・actualQuantity）、type: dupont（ROE のデュポン分解。netIncome・sales・totalAssets・equity）、type: tax-return（法人税申告書の通しの計算。別表十五・四・一・五(一)）。金額は省略できる

\`\`\`\`
\`\`\`widget
type: payroll
gross: 300000
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

export const CONSOLIDATION_FORMAT = `## 連結の事例の形式（JSON）

\`\`\`json
{
  "id": "my-domestic-60",
  "title": "国内子会社（持分 60%）の連結",
  "summary": "1〜2 文の説明",
  "level": 4,
  "unit": "千円",
  "basis": [{ "name": "連結財務諸表に関する会計基準（企業会計基準第 22 号）" }],
  "asOf": "2026-10-01",
  "updated": "2026-10-01",
  "entities": [
    {
      "id": "p",
      "name": "P 社（親会社）",
      "role": "parent",
      "note": "前提の説明（取得の時期・取得原価・グループ内の取引など）",
      "trialBalance": "普通預金 1,000 / 買掛金 500\\n子会社株式 700 / 資本金 1,000\\n売上原価 600 / 利益剰余金 200\\n/ 売上 600"
    },
    {
      "id": "s",
      "name": "S 社（子会社）",
      "role": "subsidiary",
      "ownership": 60,
      "currency": "JPY",
      "trialBalance": "…"
    }
  ],
  "eliminations": [
    {
      "id": "capital",
      "category": "capital",
      "title": "投資と資本の相殺消去",
      "question": "自分で解くときの問題文（必要な数字をすべて書く）",
      "shiwake": "資本金 500 / 子会社株式 700\\n利益剰余金 500 / 非支配株主持分 400\\nのれん 100 /",
      "explanation": "なぜその仕訳になるか"
    }
  ]
}
\`\`\`

- trialBalance は決算整理後の残高試算表を仕訳の書き方で書く（借方残高を借方、貸方残高を貸方。1 行に「借方科目 金額 / 貸方科目 金額」、行は \\n で区切る。空行は入れない）。借方の合計と貸方の合計を必ず一致させる
- 親会社（role: parent）は 1 社で、通貨は JPY。子会社には ownership（持分 %）を書く
- 海外の子会社は currency: "USD"、unit: "千ドル"、rates: { "CR": 決算日レート, "AR": 期中平均レート, "HR": 取得時レート } を書き、試算表はドルで書く（アプリが円に換算し、差額を為替換算調整勘定にする）
- category は capital（投資と資本の相殺消去）・goodwill（のれんの償却）・nci（非支配株主への配分）・intercompany（内部取引）・balances（債権債務）・unrealized（未実現利益）・dividend（配当金）・translation（換算差額の配分）・other のどれか
- opening（任意）: { "note": "説明", "balanceSheet": "前期末の連結貸借対照表（仕訳の書き方）" } を書くと、アプリが連結キャッシュ・フロー計算書を作る（利益剰余金は前期までの利益を含めた残高）
- opening を書く事例の在外子会社には、会社ごとの opening: { "balanceSheet": "前期末の貸借対照表（現地通貨・仕訳の書き方。期中に設立・取得したなら空）", "rate": 前期末の決算日レート } も書く（換算差額を出すのに使う）
- segment（任意）: 会社ごとのセグメント（事業・地域の区分）の名前。書くときはすべての会社に書くと、アプリがセグメント情報（売上高・営業利益・資産と調整額）を作る
- between（任意）: グループ内の取引の修正仕訳に ["売り手の会社の id", "買い手の会社の id"] を書くと、セグメント間の売上高を出せる
- eliminations の shiwake は 1 つの仕訳で、貸借を一致させる。連結の金額は、各社の試算表の合計に修正仕訳を加えてアプリが計算する
`;

export const EXERCISE_FORMAT = `## 決算の総合演習の形式（YAML。content/exercises/ に置く）

\`\`\`yaml
id: shop-closing
kind: closing                      # closing（個別の決算。既定）/ consolidation（連結精算表。試算表は単純合算、問題は連結修正仕訳）
title: 商品売買業の決算
summary: 1〜2 文の説明
level: 3
closingDate: '2026-03-31'          # 決算日
basis:
  - name: 企業会計原則
asOf: '2026-10-01'
updated: '2026-10-01'
lessons: [closing-overview]        # 関係するレッスンの id（任意）
note: 会計期間・三分法かどうかなどの前提（任意）
trialBalance: |                    # 決算整理前残高試算表（借方残高を借方、貸方残高を貸方に。空行は入れない）
  現金 85,000 / 買掛金 450,000
  繰越商品 120,000 / 資本金 2,000,000
adjustments:                       # 決算整理事項（1 問に 1 つの決算整理仕訳）
  - id: a1
    question: 期首商品棚卸高 120,000 円を、繰越商品勘定から仕入勘定に振り替える。
    answer: 仕入 120,000 / 繰越商品 120,000
    hint: ヒント（任意）
    explanation: 解説
\`\`\`

- アプリが、正解した（または答えを見た）決算整理だけを反映して、精算表と財務諸表を作る
- 試算表は借方と貸方の合計を必ず一致させる
`;

export const QUIZSET_FORMAT = `## 選択問題のセットの形式（YAML。content/quizzes/ に置く）

\`\`\`yaml
id: jsox-basics
title: 内部統制のきほん
track: internal-control        # 分野の id
order: 1
level: 3
summary: 1 文の説明
tags: [J-SOX]
basis:
  - name: 根拠の基準・法令
asOf: '2026-10-01'
updated: '2026-10-01'
rcm:                           # RCM の演習（任意。内部統制の分野で使う）
  process: 購買プロセス
  steps:                       # 業務記述書（手順ごと）
    - id: s1
      text: 購買課長が発注をシステム上で承認する
    - id: s2
      text: 倉庫担当者が検収を入力する
  risks:
    - id: r1                   # questions の id と重ならないようにする
      risk: 承認されていない発注が行われる
      control: s1              # コントロールがある手順の id
      assertion: 実在性        # 実在性・網羅性・権利と義務の帰属・評価の妥当性・期間配分の適切性・表示の妥当性
      type: 予防               # 予防・発見
      method: 手作業           # 手作業・自動・IT 依存の手作業
      explanation: 解説
questions:
  - id: q1
    context: 事例の説明（任意）
    question: 問題文
    choices: [選択肢A, 選択肢B, 選択肢C]
    answer: 1                  # 正解の番号（0 から）
    explanation: 解説
\`\`\`
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
    CONSOLIDATION_FORMAT,
    EXERCISE_FORMAT,
    QUIZSET_FORMAT,
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
