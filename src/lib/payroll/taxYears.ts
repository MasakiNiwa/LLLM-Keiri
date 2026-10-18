/**
 * 年末調整のルールの年分ごとのデータ（学習用）。
 *
 * 新しい年分を追加するときは、TAX_YEARS に 1 件足し、yearEnd.test.ts にその年分の検算を足す。
 * 計算の手順（yearEnd.ts）は年分で共通にし、年分で変わる金額だけをここに書く。
 */

export interface YearEndRules {
  year: number;
  /** 表示名 */
  label: string;
  /** 根拠 */
  basis: string;
  /**
   * 給与所得控除の最低額の範囲: 収入が flatUntil 未満なら、給与所得 ＝ 収入 − minimum（0 未満は 0）。
   * それ以上は、所得税法別表第五の方式（660 万円未満は 4,000 円単位）で計算する。
   */
  employment: { flatUntil: number; minimum: number };
  /** 基礎控除: [合計所得金額の上限（以下）, 控除額]。上限を超えると 0 */
  basic: [number, number][];
  /** 扶養控除（1 人あたり） */
  dependents: { general: number; specific: number; elderly: number };
  /** この年分の主な変更点（画面に表示する） */
  changes: string[];
}

export const TAX_YEARS: YearEndRules[] = [
  {
    year: 2025,
    label: '2025 年分（令和 7 年分）',
    basis: '令和 7 年度税制改正（基礎控除の見直し・給与所得控除の最低保障額の引上げ）',
    employment: { flatUntil: 1_900_000, minimum: 650_000 },
    basic: [
      [1_320_000, 950_000],
      [3_360_000, 880_000],
      [4_890_000, 680_000],
      [6_550_000, 630_000],
      [23_500_000, 580_000],
      [24_000_000, 480_000],
      [24_500_000, 320_000],
      [25_000_000, 160_000],
    ],
    dependents: { general: 380_000, specific: 630_000, elderly: 480_000 },
    changes: [
      '給与所得控除の最低保障額が 55 万円から 65 万円に',
      '基礎控除が 48 万円から 58 万円に（合計所得金額 655 万円以下は、さらに上乗せ）',
    ],
  },
  {
    year: 2026,
    label: '2026 年分（令和 8 年分）',
    basis:
      '令和 8 年度税制改正（基礎控除と給与所得控除の最低保障額の引上げ。令和 8・9 年分の特例を含む）',
    employment: { flatUntil: 2_200_000, minimum: 740_000 },
    basic: [
      [4_890_000, 1_040_000],
      [6_550_000, 670_000],
      [23_500_000, 620_000],
      [24_000_000, 480_000],
      [24_500_000, 320_000],
      [25_000_000, 160_000],
    ],
    dependents: { general: 380_000, specific: 630_000, elderly: 480_000 },
    changes: [
      '給与所得控除の最低保障額が 74 万円に（本則 69 万円 ＋ 令和 8・9 年分の特例 5 万円。収入 220 万円未満は「収入 − 74 万円」）',
      '基礎控除が本則 62 万円に。合計所得金額 489 万円以下は 104 万円、655 万円以下は 67 万円（令和 8・9 年分の特例）',
    ],
  },
];

export const LATEST_TAX_YEAR = TAX_YEARS[TAX_YEARS.length - 1].year;

/** 年分のルール（無ければ最も近い年分） */
export function rulesFor(year: number): YearEndRules {
  return (
    TAX_YEARS.find((r) => r.year === year) ??
    (year < TAX_YEARS[0].year ? TAX_YEARS[0] : TAX_YEARS[TAX_YEARS.length - 1])
  );
}
