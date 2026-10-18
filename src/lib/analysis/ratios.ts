/**
 * 財務諸表の分析（比率の計算はプログラムが行い、AI は読み方の説明だけをする）。
 *
 * 期末の残高（決算整理後の試算表。借方が正）から、収益性・安全性・効率性の主な比率を出す。
 * 学習用に、期首と期末の平均ではなく期末の残高を使う。
 */
import type { AccountBook } from '../content/accounts.ts';

export type RatioCategory = 'profitability' | 'safety' | 'efficiency';

export const RATIO_CATEGORIES: Record<RatioCategory, string> = {
  profitability: '収益性（どれだけもうけているか）',
  safety: '安全性（支払いに困らないか）',
  efficiency: '効率性（資産をうまく使っているか）',
};

/** 比率の分子・分母（ドリルダウン用に、もとの科目を持つ） */
export interface RatioTerm {
  label: string;
  value: number;
  /** 科目ごとの金額（足すと value になる。費用などは負） */
  parts: { account: string; amount: number }[];
}

export interface Ratio {
  id: string;
  label: string;
  category: RatioCategory;
  numerator: RatioTerm;
  denominator: RatioTerm;
  /** % または 回。分母が 0 以下なら null */
  value: number | null;
  unit: '%' | '回';
  formula: string;
  /** 読み方 */
  explanation: string;
}

export interface Figures {
  sales: RatioTerm;
  grossProfit: RatioTerm;
  operatingIncome: RatioTerm;
  ordinaryIncome: RatioTerm;
  netIncome: RatioTerm;
  currentAssets: RatioTerm;
  quickAssets: RatioTerm;
  currentLiabilities: RatioTerm;
  totalAssets: RatioTerm;
  equity: RatioTerm;
}

/** 当座資産（すぐにお金になる資産）にする科目 */
const QUICK = new Set([
  '現金',
  '小口現金',
  '当座預金',
  '普通預金',
  '定期預金',
  '受取手形',
  '電子記録債権',
  '売掛金',
  'クレジット売掛金',
  '売買目的有価証券',
  '貸倒引当金',
]);
const NCI = '非支配株主持分';

function term(
  label: string,
  balances: Map<string, number>,
  book: AccountBook,
  pick: (name: string, group: string, element: string) => number,
): RatioTerm {
  const parts: RatioTerm['parts'] = [];
  for (const [name, bal] of balances) {
    const a = book.find(name);
    if (!a || bal === 0) continue;
    const sign = pick(a.name, a.group, a.element);
    if (sign) parts.push({ account: a.name, amount: sign * bal });
  }
  const order = new Map(book.accounts.map((a, i) => [a.name, i]));
  parts.sort((x, y) => (order.get(x.account) ?? 0) - (order.get(y.account) ?? 0));
  return { label, value: parts.reduce((s, p) => s + p.amount, 0), parts };
}

/** 残高から、分析に使う金額を出す（収益・費用は損益の符号、資産は借方、負債・純資産は貸方を正） */
export function figures(balances: Map<string, number>, book: AccountBook): Figures {
  const pl = (groups: string[]) => (_: string, g: string, el: string) =>
    (el === 'revenue' || el === 'expense') && groups.includes(g) ? -1 : 0;
  const sales = term('売上高', balances, book, pl(['売上高']));
  const grossProfit = term('売上総利益', balances, book, pl(['売上高', '売上原価']));
  const operatingIncome = term(
    '営業利益',
    balances,
    book,
    pl(['売上高', '売上原価', '販売費及び一般管理費']),
  );
  const ordinaryIncome = term(
    '経常利益',
    balances,
    book,
    pl(['売上高', '売上原価', '販売費及び一般管理費', '営業外収益', '営業外費用']),
  );
  // 当期純利益（連結では、非支配株主に帰属する分を差し引いた親会社株主に帰属する分）
  const netIncome = term('当期純利益', balances, book, (_, __, el) =>
    el === 'revenue' || el === 'expense' ? -1 : 0,
  );
  const currentAssets = term('流動資産', balances, book, (_, g, el) =>
    el === 'asset' && g === '流動資産' ? 1 : 0,
  );
  const quickAssets = term('当座資産', balances, book, (n, _, el) =>
    el === 'asset' && QUICK.has(n) ? 1 : 0,
  );
  const currentLiabilities = term('流動負債', balances, book, (_, g, el) =>
    el === 'liability' && g === '流動負債' ? -1 : 0,
  );
  const totalAssets = term('総資産', balances, book, (_, __, el) => (el === 'asset' ? 1 : 0));
  // 自己資本 ＝ 純資産（当期純利益を含む）− 非支配株主持分
  const eq = term('自己資本', balances, book, (n, _, el) =>
    el === 'equity' && n !== NCI ? -1 : 0,
  );
  const equity: RatioTerm = {
    label: '自己資本',
    value: eq.value + netIncome.value,
    parts: [...eq.parts, { account: '当期純利益（当期分）', amount: netIncome.value }],
  };
  return {
    sales,
    grossProfit,
    operatingIncome,
    ordinaryIncome,
    netIncome,
    currentAssets,
    quickAssets,
    currentLiabilities,
    totalAssets,
    equity,
  };
}

function ratio(
  id: string,
  label: string,
  category: RatioCategory,
  numerator: RatioTerm,
  denominator: RatioTerm,
  unit: '%' | '回',
  explanation: string,
): Ratio {
  const raw = denominator.value > 0 ? numerator.value / denominator.value : null;
  const value =
    raw === null ? null : Math.round(raw * (unit === '%' ? 1000 : 100)) / (unit === '%' ? 10 : 100);
  return {
    id,
    label,
    category,
    numerator,
    denominator,
    value,
    unit,
    formula: `${numerator.label} ÷ ${denominator.label}${unit === '%' ? ' × 100' : ''}`,
    explanation,
  };
}

/** 主な比率。% は小数第 1 位、回は小数第 2 位まで（四捨五入） */
export function analyze(balances: Map<string, number>, book: AccountBook): Ratio[] {
  const f = figures(balances, book);
  return [
    ratio(
      'gross-margin',
      '売上総利益率',
      'profitability',
      f.grossProfit,
      f.sales,
      '%',
      '売上のうち、商品・製品の原価を引いて残る割合。商品の値付けや仕入の条件の良さを表す',
    ),
    ratio(
      'operating-margin',
      '売上高営業利益率',
      'profitability',
      f.operatingIncome,
      f.sales,
      '%',
      '本業でどれだけもうけたか。販売費及び一般管理費（人件費・家賃など）まで差し引いたあとの割合',
    ),
    ratio(
      'ordinary-margin',
      '売上高経常利益率',
      'profitability',
      f.ordinaryIncome,
      f.sales,
      '%',
      '利息の支払いなど、本業以外の経常的な損益も含めた割合。借入れが多いと営業利益率より下がる',
    ),
    ratio(
      'net-margin',
      '売上高当期純利益率',
      'profitability',
      f.netIncome,
      f.sales,
      '%',
      '税金や特別な損益まで差し引いて、最終的に残った利益の割合',
    ),
    ratio(
      'roa',
      'ROA（総資産利益率）',
      'profitability',
      f.netIncome,
      f.totalAssets,
      '%',
      '会社の資産全体を使って、どれだけ利益を上げたか（ここでは当期純利益を使う。経常利益を使う方法もある）',
    ),
    ratio(
      'roe',
      'ROE（自己資本利益率）',
      'profitability',
      f.netIncome,
      f.equity,
      '%',
      '株主の出したお金（自己資本）に対して、どれだけ利益を上げたか。株主から見た効率',
    ),
    ratio(
      'current-ratio',
      '流動比率',
      'safety',
      f.currentAssets,
      f.currentLiabilities,
      '%',
      '1 年以内に払う負債に対して、1 年以内にお金になる資産がどれだけあるか。100% を下回ると、短期の支払いに注意がいる',
    ),
    ratio(
      'quick-ratio',
      '当座比率',
      'safety',
      f.quickAssets,
      f.currentLiabilities,
      '%',
      '流動比率から在庫などを除き、すぐにお金になる資産（現金預金・売上債権など）だけで見た支払いの力',
    ),
    ratio(
      'equity-ratio',
      '自己資本比率',
      'safety',
      f.equity,
      f.totalAssets,
      '%',
      '資産のうち、返す必要のない自己資本でまかなっている割合。高いほど借入れに頼らない安定した会社',
    ),
    ratio(
      'asset-turnover',
      '総資産回転率',
      'efficiency',
      f.sales,
      f.totalAssets,
      '回',
      '資産の何倍の売上を上げたか。高いほど資産を効率よく使っている（業種で大きく違う）',
    ),
  ];
}

/** 比率の値の表示 */
export function ratioText(r: Pick<Ratio, 'value' | 'unit'>): string {
  if (r.value === null) return '—';
  return r.unit === '%' ? `${r.value.toFixed(1)}%` : `${r.value.toFixed(2)} 回`;
}
