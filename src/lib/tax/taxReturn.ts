/**
 * 法人税申告書の通しの計算（学習用。プログラムが計算する）。
 *
 * 決算の数字から、別表十五（交際費の損金不算入額）→ 別表四（所得金額）→ 別表一（法人税額・差引の納付額）
 * → 別表五(一)（利益積立金額のうち、減価償却超過額と納税充当金の動き）を順に作る。
 * 地方法人税・税額控除・欠損金・住民税・事業税の計算は考えない。
 */
import { beppyo4, type Beppyo4Item, type Beppyo4Result } from './beppyo4.ts';

export interface TaxReturnInput {
  /** 当期利益（損益計算書の当期純利益） */
  netIncome: number;
  /** 当期に支払った配当（社外流出） */
  dividends: number;
  /** 損金経理をした法人税（中間納付分） */
  interimCorporateTax: number;
  /** 損金経理をした住民税（中間納付分） */
  interimResidentTax: number;
  /** 損金経理をした納税充当金（当期の繰入額） */
  provision: number;
  /** 期首の納税充当金 */
  provisionOpening: number;
  /** 当期に納税充当金を取り崩して支払った額（前期分の法人税・住民税・事業税など） */
  provisionUsed: number;
  /** うち、事業税など損金になる税（別表四で減算） */
  provisionUsedEnterpriseTax: number;
  /** 交際費等の支出額 */
  entertainment: number;
  /** うち接待飲食費 */
  entertainmentMeals: number;
  /** 中小法人（資本金 1 億円以下など）か */
  smallCompany: boolean;
  /** 減価償却の償却超過額 */
  depreciationExcess: number;
  /** 受取配当等の益金不算入額 */
  dividendExclusion: number;
}

export interface TaxReturnResult {
  entertainment: { limit: number; nondeductible: number; method: string };
  beppyo4: Beppyo4Result;
  /** 別表一 */
  beppyo1: {
    taxableIncome: number;
    /** 税率ごとの内訳 */
    brackets: { label: string; base: number; rate: number; tax: number }[];
    corporateTax: number;
    interim: number;
    /** 差引の納付額（100 円未満切り捨て） */
    payable: number;
  };
  /** 別表五(一)（一部） */
  beppyo5: {
    label: string;
    opening: number;
    decrease: number;
    increase: number;
    closing: number;
  }[];
}

export const SMALL_COMPANY_LIMIT = 8_000_000;

export function taxReturn(i: TaxReturnInput): TaxReturnResult {
  // 別表十五: 中小法人は「年 800 万円までの定額控除」と「接待飲食費の 50%」の有利なほう
  const fixed = Math.min(i.entertainment, SMALL_COMPANY_LIMIT);
  const meals = Math.floor(i.entertainmentMeals * 0.5);
  const useFixed = i.smallCompany && fixed >= meals;
  const limit = useFixed ? fixed : meals;
  const entertainment = {
    limit,
    nondeductible: Math.max(0, i.entertainment - limit),
    method: useFixed ? '定額控除限度額（年 800 万円まで）' : '接待飲食費の 50%',
  };

  const items: Beppyo4Item[] = [
    {
      label: '損金経理をした法人税',
      amount: i.interimCorporateTax,
      kind: 'add',
      disposition: 'retained',
    },
    {
      label: '損金経理をした住民税',
      amount: i.interimResidentTax,
      kind: 'add',
      disposition: 'retained',
    },
    {
      label: '損金経理をした納税充当金',
      amount: i.provision,
      kind: 'add',
      disposition: 'retained',
    },
    {
      label: '交際費等の損金不算入額',
      amount: entertainment.nondeductible,
      kind: 'add',
      disposition: 'outflow',
    },
    {
      label: '減価償却の償却超過額',
      amount: i.depreciationExcess,
      kind: 'add',
      disposition: 'retained',
    },
    {
      label: '納税充当金から支出した事業税等',
      amount: i.provisionUsedEnterpriseTax,
      kind: 'deduct',
      disposition: 'retained',
    },
    {
      label: '受取配当等の益金不算入額',
      amount: i.dividendExclusion,
      kind: 'deduct',
      disposition: 'outflow',
    },
  ];
  const b4 = beppyo4({ netIncome: i.netIncome, dividends: i.dividends, items, rate: 0 });

  // 別表一: 中小法人は年 800 万円以下の部分に軽減税率（特例で 15%）、それ以外は 23.2%
  const taxable = b4.taxableIncome;
  const brackets = i.smallCompany
    ? [
        { label: '年 800 万円以下の部分', base: Math.min(taxable, SMALL_COMPANY_LIMIT), rate: 15 },
        {
          label: '年 800 万円を超える部分',
          base: Math.max(0, taxable - SMALL_COMPANY_LIMIT),
          rate: 23.2,
        },
      ]
    : [{ label: '所得金額', base: taxable, rate: 23.2 }];
  const withTax = brackets.map((b) => ({ ...b, tax: Math.floor((b.base * b.rate) / 100) }));
  const corporateTax = withTax.reduce((s, b) => s + b.tax, 0);
  const payable = Math.floor((corporateTax - i.interimCorporateTax) / 100) * 100;

  const row = (label: string, opening: number, decrease: number, increase: number) => ({
    label,
    opening,
    decrease,
    increase,
    closing: opening - decrease + increase,
  });
  return {
    entertainment,
    beppyo4: b4,
    beppyo1: {
      taxableIncome: taxable,
      brackets: withTax,
      corporateTax,
      interim: i.interimCorporateTax,
      payable,
    },
    beppyo5: [
      row('減価償却超過額', 0, 0, i.depreciationExcess),
      row('納税充当金', i.provisionOpening, i.provisionUsed, i.provision),
    ],
  };
}
