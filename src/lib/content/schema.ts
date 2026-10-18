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

/** 用語集の 1 語（content/glossary.yaml） */
export const GlossaryTermSchema = z.object({
  term: z.string().min(1),
  kana: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  description: z.string().min(1),
  /** 詳しく学べるレッスンの id */
  lessons: z.array(z.string()).default([]),
  /** 関連する用語・勘定科目 */
  related: z.array(z.string().min(1)).default([]),
});
export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

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

const yenAmount = z.number().int().min(0);

/** レッスンの中の計算の部品（` ```widget `）。数字を変えると、プログラムが仕訳を作り直す */
export const WidgetSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('payroll'),
    gross: yenAmount.default(300000),
    incomeTax: yenAmount.default(7000),
    residentTax: yenAmount.default(12000),
    socialInsurance: yenAmount.default(45000),
  }),
  z.object({
    type: z.literal('collection'),
    billed: yenAmount.default(110000),
    received: yenAmount.default(109560),
  }),
  z.object({
    type: z.literal('withholding'),
    fee: yenAmount.default(100000),
    consumptionTax: yenAmount.default(10000),
  }),
  z.object({
    type: z.literal('asset-disposal'),
    cost: yenAmount.default(600000),
    life: z.number().int().min(1).default(5),
    yearsUsed: z.number().int().min(0).default(2),
    months: z.number().int().min(0).max(12).default(6),
    price: yenAmount.default(250000),
  }),
  z.object({
    type: z.literal('points'),
    price: yenAmount.default(10000),
    points: yenAmount.default(100),
    usageRate: z.number().int().min(0).max(100).default(100),
  }),
  z.object({
    type: z.literal('impairment'),
    bookValue: yenAmount.default(5000000),
    undiscounted: yenAmount.default(4000000),
    netSellingPrice: yenAmount.default(2800000),
    valueInUse: yenAmount.default(3000000),
  }),
  z.object({
    type: z.literal('lease'),
    payment: yenAmount.default(100000),
    years: z.number().int().min(1).max(50).default(5),
    rate: z.number().min(0).max(99).default(3),
  }),
  z.object({
    type: z.literal('process-costing'),
    beginQty: yenAmount.default(200),
    beginProgress: z.number().min(0).max(100).default(50),
    beginMaterial: yenAmount.default(40000),
    beginConversion: yenAmount.default(18000),
    material: yenAmount.default(200000),
    conversion: yenAmount.default(279000),
    completedQty: yenAmount.default(1000),
    endQty: yenAmount.default(200),
    endProgress: z.number().min(0).max(100).default(50),
  }),
  z.object({
    type: z.literal('overhead'),
    variableBudget: yenAmount.default(200000),
    fixedBudget: yenAmount.default(300000),
    normalHours: z.number().int().min(1).default(1000),
    actualHours: yenAmount.default(950),
    actualCost: yenAmount.default(492000),
  }),
  z.object({
    type: z.literal('standard-cost'),
    standardPrice: yenAmount.default(100),
    standardQty: yenAmount.default(1000),
    actualPrice: yenAmount.default(105),
    actualQty: yenAmount.default(980),
  }),
  z.object({
    type: z.literal('cvp'),
    sales: yenAmount.default(1000000),
    variableCosts: yenAmount.default(600000),
    fixedCosts: yenAmount.default(300000),
    targetProfit: yenAmount.default(200000),
  }),
  z.object({
    type: z.literal('deficiency'),
    pretaxIncome: yenAmount.default(2000000000),
    potentialMisstatement: yenAmount.default(120000000),
  }),
  z.object({
    type: z.literal('beppyo4'),
    netIncome: z.number().int().default(10000000),
    dividends: yenAmount.default(2000000),
    provision: yenAmount.default(4000000),
    entertainment: yenAmount.default(500000),
    depreciation: yenAmount.default(300000),
    enterpriseTax: yenAmount.default(600000),
    dividendExclusion: yenAmount.default(200000),
    rate: z.number().min(0).max(100).default(23.2),
  }),
  z.object({
    type: z.literal('tax-return'),
    netIncome: z.number().int().default(6000000),
    dividends: yenAmount.default(1000000),
    interimCorporateTax: yenAmount.default(400000),
    interimResidentTax: yenAmount.default(50000),
    provision: yenAmount.default(1750000),
    provisionOpening: yenAmount.default(1200000),
    provisionUsed: yenAmount.default(1200000),
    provisionUsedEnterpriseTax: yenAmount.default(250000),
    entertainment: yenAmount.default(9000000),
    entertainmentMeals: yenAmount.default(4000000),
    smallCompany: z.boolean().default(true),
    depreciationExcess: yenAmount.default(300000),
    dividendExclusion: yenAmount.default(100000),
  }),
  z.object({
    type: z.literal('local-tax'),
    corporateTax: yenAmount.default(1466800),
    income: yenAmount.default(9150000),
    capital: yenAmount.default(10000000),
    employees: z.number().int().min(0).default(30),
    months: z.number().int().min(1).max(12).default(12),
    noReducedRate: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('payroll-month'),
    basePay: yenAmount.default(300000),
    allowances: yenAmount.default(20000),
    commute: yenAmount.default(15000),
    monthlyHours: z.number().positive().default(160),
    overtimeHours: z.number().min(0).default(10),
    overtimeRate: z.number().min(0).default(25),
    standardMonthly: yenAmount.default(340000),
    healthRate: z.number().min(0).default(10),
    careRate: z.number().min(0).default(0),
    pensionRate: z.number().min(0).default(18.3),
    employmentRate: z.number().min(0).default(0.55),
    incomeTax: yenAmount.default(8000),
    residentTax: yenAmount.default(15000),
  }),
  z.object({
    type: z.literal('year-end'),
    /** 年分（src/lib/payroll/taxYears.ts にある年分） */
    year: z.number().int().default(2025),
    salary: yenAmount.default(5000000),
    withheld: yenAmount.default(120000),
    socialInsurance: yenAmount.default(720000),
    insurance: yenAmount.default(40000),
    spouse: yenAmount.default(0),
    dependents: z.number().int().min(0).default(1),
    specificDependents: z.number().int().min(0).default(0),
    elderlyDependents: z.number().int().min(0).default(0),
    housingLoan: yenAmount.default(0),
  }),
  z.object({
    type: z.literal('working-capital'),
    sales: yenAmount.default(36500000),
    cogs: yenAmount.default(25550000),
    receivables: yenAmount.default(6000000),
    inventory: yenAmount.default(2100000),
    payables: yenAmount.default(2800000),
  }),
  z.object({
    type: z.literal('cash-plan'),
    months: z.number().int().min(1).max(24).default(6),
    openingCash: z.number().int().default(3000000),
    sales: yenAmount.default(10000000),
    growth: z.number().default(20),
    cashSalesRate: z.number().min(0).max(100).default(0),
    collectionLag: z.number().int().min(0).max(3).default(2),
    costRate: z.number().min(0).max(100).default(80),
    paymentLag: z.number().int().min(0).max(3).default(1),
    expenses: yenAmount.default(1500000),
    loanMonth: z.number().int().min(0).default(0),
    loanAmount: yenAmount.default(0),
    repayment: yenAmount.default(0),
    minimumCash: yenAmount.default(1000000),
  }),
  z.object({
    type: z.literal('sales-variance'),
    budgetPrice: yenAmount.default(1000),
    budgetQuantity: z.number().min(0).default(10000),
    actualPrice: yenAmount.default(950),
    actualQuantity: z.number().min(0).default(11000),
  }),
  z.object({
    type: z.literal('dupont'),
    netIncome: z.number().int().default(40000000),
    sales: yenAmount.default(800000000),
    totalAssets: yenAmount.default(1000000000),
    equity: yenAmount.default(400000000),
  }),
  z.object({
    type: z.literal('tax-settlement'),
    received: yenAmount.default(150000),
    paid: yenAmount.default(105000),
  }),
]);
export type Widget = z.infer<typeof WidgetSchema>;

export const DrillQuestionSchema = ShiwakeQuestionSchema.extend({ id: z.string().min(1) });
export type DrillQuestion = z.infer<typeof DrillQuestionSchema>;

export const DrillSetSchema = z.object({
  ...contentMeta,
  questions: z.array(DrillQuestionSchema).min(1),
});
export type DrillSet = z.infer<typeof DrillSetSchema>;
export type DrillMeta = Omit<DrillSet, 'questions'> & { questionCount: number };

/** 選択問題のセット（内部統制など、仕訳ではない問題の練習） */
export const QuizQuestionSchema = z.object({
  id: z.string().min(1),
  /** 問題の前提（事例の説明など。任意） */
  context: z.string().optional(),
  question: z.string().min(1),
  choices: z.array(z.string().min(1)).min(2),
  /** 正解の選択肢の番号（0 から） */
  answer: z.number().int().min(0),
  explanation: z.string().min(1),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

/** J-SOX のアサーション（RCM の演習で選ぶ） */
export const RCM_ASSERTIONS = [
  '実在性',
  '網羅性',
  '権利と義務の帰属',
  '評価の妥当性',
  '期間配分の適切性',
  '表示の妥当性',
] as const;
export const RCM_TYPES = ['予防', '発見'] as const;
export const RCM_METHODS = ['手作業', '自動', 'IT 依存の手作業'] as const;

/** RCM の演習: 業務記述書の手順を読み、リスクごとにコントロールと性質を選ぶ */
export const RcmCaseSchema = z.object({
  /** 業務プロセスの名前 */
  process: z.string().min(1),
  /** 業務記述書（手順ごと） */
  steps: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2),
  risks: z
    .array(
      z.object({
        id: z.string().min(1),
        risk: z.string().min(1),
        /** リスクに対応するコントロールがある手順の id */
        control: z.string().min(1),
        assertion: z.enum(RCM_ASSERTIONS),
        type: z.enum(RCM_TYPES),
        method: z.enum(RCM_METHODS),
        explanation: z.string().min(1),
      }),
    )
    .min(1),
});
export type RcmCase = z.infer<typeof RcmCaseSchema>;

/** 組み合わせの演習: 項目ごとに、共通の選択肢から 1 つを選ぶ（監査人の依頼 → 提出する資料など） */
export const MatchExerciseSchema = z.object({
  title: z.string().min(1),
  /** 前提の説明（任意） */
  intro: z.string().optional(),
  /** 選択肢の欄の名前（例: 提出する資料） */
  optionsLabel: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), text: z.string().min(1) })).min(2),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        prompt: z.string().min(1),
        answer: z.string().min(1),
        explanation: z.string().min(1),
      }),
    )
    .min(1),
});
export type MatchExercise = z.infer<typeof MatchExerciseSchema>;

export const QuizSetSchema = z.object({
  ...contentMeta,
  /** RCM の演習（任意。選択問題の前に表示する） */
  rcm: RcmCaseSchema.optional(),
  /** 組み合わせの演習（任意。選択問題の前に表示する） */
  match: MatchExerciseSchema.optional(),
  questions: z.array(QuizQuestionSchema).min(1),
});
export type QuizSet = z.infer<typeof QuizSetSchema>;
export type QuizMeta = Omit<QuizSet, 'questions' | 'rcm' | 'match'> & { questionCount: number };

/** 帳簿のサンプル（一連の取引。帳簿ページで読み込める） */
export const ScenarioSchema = z.object({
  id,
  title: z.string().min(1),
  summary: z.string().min(1),
  level,
  entries: z
    .array(
      z.object({
        date,
        memo: z.string().min(1),
        /** 仕訳の書き方（1 つの仕訳） */
        shiwake: z.string().min(1),
      }),
    )
    .min(1),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

/** 総合演習の種類ごとの呼び方 */
export const EXERCISE_LABELS = {
  closing: { adjustment: '決算整理', trialBalance: '決算整理前残高試算表', items: '決算整理事項' },
  consolidation: {
    adjustment: '連結修正',
    trialBalance: '個別財務諸表の合算（単純合算）',
    items: '連結修正事項',
  },
} as const;

/** 決算の総合演習（決算整理前残高試算表と決算整理事項。連結精算表は合算と連結修正事項） */
export const ClosingExerciseSchema = z.object({
  id,
  /** closing: 個別の決算、consolidation: 連結精算表 */
  kind: z.enum(['closing', 'consolidation']).default('closing'),
  title: z.string().min(1),
  summary: z.string().min(1),
  level,
  /** 決算日（YYYY-MM-DD） */
  closingDate: date,
  basis: z.array(BasisSchema).default([]),
  asOf: date,
  updated: date,
  lessons: z.array(z.string()).default([]),
  /** 前提（会社の説明・決算整理の共通の条件） */
  note: z.string().optional(),
  /** 決算整理前残高試算表（仕訳の書き方。借方残高を借方、貸方残高を貸方に。空行は入れない） */
  trialBalance: z.string().min(1),
  /** 決算整理事項（1 つの問題に 1 つの決算整理仕訳） */
  adjustments: z.array(DrillQuestionSchema).min(1),
});
export type ClosingExercise = z.infer<typeof ClosingExerciseSchema>;
export type ClosingExerciseMeta = Pick<
  ClosingExercise,
  'id' | 'kind' | 'title' | 'summary' | 'level'
> & {
  adjustmentCount: number;
};

/** 連結の会社の通貨（円以外は在外子会社として、円に換算してから連結する） */
export const CURRENCIES = ['JPY', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

/** 換算のレート（1 単位あたりの円）。CR: 決算日、AR: 期中平均、HR: 取得時（資本） */
export const RatesSchema = z.object({
  CR: z.number().positive(),
  AR: z.number().positive(),
  HR: z.number().positive(),
});
export type Rates = z.infer<typeof RatesSchema>;

export const EntitySchema = z.object({
  id,
  name: z.string().min(1),
  role: z.enum(['parent', 'subsidiary']),
  currency: z.enum(CURRENCIES).default('JPY'),
  /** 金額の単位の表示（例: 千円、千ドル） */
  unit: z.string().default('千円'),
  /** 親会社の持分割合（%）。子会社だけ */
  ownership: z.number().gt(0).max(100).optional(),
  /** 在外子会社の換算レート */
  rates: RatesSchema.optional(),
  /** 科目ごとに使うレート（資本の科目の発生時のレートなど。無ければ区分で決める） */
  historical: z.record(z.string(), z.number().positive()).default({}),
  /** 決算整理後の残高試算表（仕訳の書き方。借方に借方残高、貸方に貸方残高を書く） */
  trialBalance: z.string().min(1),
  note: z.string().optional(),
  /** セグメント（事業・地域の区分）の名前。書くときはすべての会社に書く */
  segment: z.string().min(1).optional(),
  /** 期首（前期末）の貸借対照表（現地通貨）と前期末のレート。在外子会社のキャッシュ・フロー計算書に使う */
  opening: z
    .object({
      /** 仕訳の書き方。期中に設立・取得した会社は空にする */
      balanceSheet: z.string().default(''),
      /** 前期末の決算日レート */
      rate: z.number().positive().optional(),
    })
    .optional(),
});
export type Entity = z.infer<typeof EntitySchema>;

export const ELIMINATION_CATEGORIES = {
  capital: '投資と資本の相殺消去',
  goodwill: 'のれんの償却',
  nci: '非支配株主への配分',
  intercompany: '内部取引の消去',
  balances: '債権債務の相殺消去',
  unrealized: '未実現利益の消去',
  dividend: '配当金の修正',
  translation: '換算差額の配分',
  other: 'そのほか',
} as const;

export const EliminationSchema = z.object({
  id,
  category: z.enum(Object.keys(ELIMINATION_CATEGORIES) as [keyof typeof ELIMINATION_CATEGORIES]),
  title: z.string().min(1),
  /** 自分で解くときの問題文（取引の説明と、必要な数字） */
  question: z.string().min(1),
  /** 連結修正仕訳（仕訳の書き方。1 つの仕訳） */
  shiwake: z.string().min(1),
  explanation: z.string().min(1),
  /** グループ内の取引の［売り手, 買い手］の会社の id（セグメント間の売上高を出すのに使う） */
  between: z.tuple([z.string(), z.string()]).optional(),
});
export type Elimination = z.infer<typeof EliminationSchema>;

/** 連結の事例（親会社と子会社の試算表、連結修正仕訳） */
export const ConsolidationCaseSchema = z.object({
  id,
  title: z.string().min(1),
  summary: z.string().min(1),
  level,
  /** 連結財務諸表の金額の単位 */
  unit: z.string().default('千円'),
  /** 関係するレッスンの id */
  lessons: z.array(z.string()).default([]),
  basis: z.array(BasisSchema).default([]),
  asOf: date,
  updated: date,
  entities: z.array(EntitySchema).min(2),
  eliminations: z.array(EliminationSchema).min(1),
  /** 前期末（期首）の連結貸借対照表。あればキャッシュ・フロー計算書を作る */
  opening: z
    .object({
      note: z.string().optional(),
      /** 仕訳の書き方（借方に資産、貸方に負債・純資産） */
      balanceSheet: z.string().min(1),
    })
    .optional(),
});
export type ConsolidationCase = z.infer<typeof ConsolidationCaseSchema>;
export type ConsolidationMeta = Pick<
  ConsolidationCase,
  'id' | 'title' | 'summary' | 'level' | 'asOf' | 'lessons'
> & { entities: { name: string; currency: Currency }[]; eliminationCount: number };

/** content/index.json（一覧に必要なものだけ。本文は別ファイル） */
export interface ContentIndex {
  version: 1;
  tracks: Track[];
  lessons: LessonMeta[];
  drills: DrillMeta[];
  accounts: Account[];
  glossary: GlossaryTerm[];
  rules: Rule[];
  scenarios: Scenario[];
  consolidations: ConsolidationMeta[];
  exercises: ClosingExerciseMeta[];
  quizzes: QuizMeta[];
}

/** 検索の対象（content/search.json） */
export interface SearchDoc {
  /** lesson:<id> / drill:<id> / quiz:<id> / account:<科目名> / term:<用語> */
  id: string;
  kind: 'lesson' | 'drill' | 'account' | 'term' | 'quiz';
  title: string;
  track?: string;
  text: string;
}
