/**
 * 1 か月分の給与計算（学習用。料率・税額は入力してもらい、計算と仕訳はプログラムが行う）。
 *
 * - 時間外労働の割増賃金: 1 時間あたりの賃金 × 割増率 × 時間（1 円未満は四捨五入）
 * - 社会保険料（本人負担）: 標準報酬月額 × 料率 ÷ 2。給与から差し引くときの端数は、50 銭以下切り捨て・50 銭を超えると切り上げ
 * - 雇用保険料（本人負担）: 賃金の総額（通勤手当を含む）× 本人の料率。端数は同じ
 * - 源泉所得税・住民税は、源泉徴収税額表・特別徴収税額の通知の額を入れる
 */
import type { JournalEntry, JournalLine } from '../journal/types.ts';

/** 被保険者が負担する保険料の端数処理（50 銭以下切り捨て、50 銭超切り上げ） */
export function roundHalfDown(x: number): number {
  const fl = Math.floor(x + 1e-9);
  return x - fl > 0.5 + 1e-9 ? fl + 1 : fl;
}

export interface MonthlyPayInput {
  basePay: number;
  /** 割増賃金の計算に入れる手当（役職手当など） */
  allowances: number;
  /** 通勤手当（非課税の範囲内とする） */
  commute: number;
  /** 1 か月平均の所定労働時間 */
  monthlyHours: number;
  /** 時間外労働の時間 */
  overtimeHours: number;
  /** 割増率（%） */
  overtimeRate: number;
  /** 標準報酬月額 */
  standardMonthly: number;
  /** 健康保険料率（%。会社と本人の合計） */
  healthRate: number;
  /** 介護保険料率（%。40〜64 歳のとき。合計） */
  careRate: number;
  /** 厚生年金保険料率（%。合計） */
  pensionRate: number;
  /** 雇用保険料率（%。本人負担分） */
  employmentRate: number;
  /** 源泉所得税（税額表で求めた額） */
  incomeTax: number;
  /** 住民税（特別徴収の月額） */
  residentTax: number;
}

export interface MonthlyPayResult {
  hourly: number;
  overtimePay: number;
  gross: number;
  health: number;
  pension: number;
  employment: number;
  socialTotal: number;
  /** 源泉徴収税額表を引くときの金額（課税の支給額 − 社会保険料等） */
  taxBase: number;
  deductions: number;
  netPay: number;
  /** 会社負担の健康保険・介護保険・厚生年金（端数は学習用に本人と同じ額とする） */
  employerSocial: number;
  payday: JournalEntry;
  accrual: JournalEntry;
  error?: string;
}

export function monthlyPay(i: MonthlyPayInput): MonthlyPayResult {
  const vals = Object.values(i);
  if (vals.some((v) => !Number.isFinite(v) || v < 0) || i.monthlyHours <= 0) {
    return {
      hourly: 0,
      overtimePay: 0,
      gross: 0,
      health: 0,
      pension: 0,
      employment: 0,
      socialTotal: 0,
      taxBase: 0,
      deductions: 0,
      netPay: 0,
      employerSocial: 0,
      payday: { lines: [] },
      accrual: { lines: [] },
      error: '数値を 0 以上で入れてください（所定労働時間は 1 以上）',
    };
  }
  const hourly = (i.basePay + i.allowances) / i.monthlyHours;
  const overtimePay = Math.round(hourly * (1 + i.overtimeRate / 100) * i.overtimeHours);
  const taxable = i.basePay + i.allowances + overtimePay;
  const gross = taxable + i.commute;
  // 健康保険と介護保険は合わせた料率で計算する
  const health = roundHalfDown((i.standardMonthly * (i.healthRate + i.careRate)) / 100 / 2);
  const pension = roundHalfDown((i.standardMonthly * i.pensionRate) / 100 / 2);
  const employment = roundHalfDown((gross * i.employmentRate) / 100);
  const socialTotal = health + pension + employment;
  const taxBase = taxable - socialTotal;
  const deductions = socialTotal + i.incomeTax + i.residentTax;
  const netPay = gross - deductions;
  const employerSocial = health + pension;
  const lines: JournalLine[] = [
    { side: 'dr', account: '給料', amount: taxable },
    { side: 'dr', account: '旅費交通費', amount: i.commute },
    { side: 'cr', account: '社会保険料預り金', amount: health + pension },
    { side: 'cr', account: '預り金', amount: employment + i.residentTax },
    { side: 'cr', account: '所得税預り金', amount: i.incomeTax },
    { side: 'cr', account: '普通預金', amount: netPay },
  ];
  return {
    hourly,
    overtimePay,
    gross,
    health,
    pension,
    employment,
    socialTotal,
    taxBase,
    deductions,
    netPay,
    employerSocial,
    payday: {
      caption: '給料日: 差し引いた額は預り金、手取りを振り込む（通勤手当は旅費交通費）',
      lines: lines.filter((l) => l.amount),
    },
    accrual: {
      caption: '月末: 会社負担の社会保険料（翌月末に納付）を見越し計上',
      lines: [
        { side: 'dr', account: '法定福利費', amount: employerSocial },
        { side: 'cr', account: '未払費用', amount: employerSocial },
      ],
    },
  };
}
