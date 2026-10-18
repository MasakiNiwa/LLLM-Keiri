/**
 * 報酬・料金の源泉徴収（所得税法 204 条 1 項 1 号・2 号の報酬。原稿料・講演料・デザイン料・税理士などの報酬）。
 * 復興特別所得税を含めた税率で計算する（2013 年 1 月 1 日から 2037 年 12 月 31 日までの支払い）。
 * 司法書士など、計算方法が違う報酬は対象外。
 */
import type { JournalEntry } from '../journal/types.ts';

/** 同じ人への 1 回の支払額のうち、税率が変わる境目 */
export const WITHHOLDING_THRESHOLD = 1_000_000;
/** 100 万円以下の部分の税率（所得税 10% × 1.021） */
export const WITHHOLDING_RATE_LOW = 10.21;
/** 100 万円を超える部分の税率（所得税 20% × 1.021） */
export const WITHHOLDING_RATE_HIGH = 20.42;

/** 源泉徴収する税額（1 円未満の端数は切り捨て） */
export function withholdingTax(amount: number): number {
  if (!Number.isInteger(amount) || amount <= 0) return 0;
  const low = Math.min(amount, WITHHOLDING_THRESHOLD);
  const high = Math.max(0, amount - WITHHOLDING_THRESHOLD);
  // 小数の誤差を避けるため、0.01% 単位の整数で計算する
  return Math.floor(
    (low * WITHHOLDING_RATE_LOW * 100 + high * WITHHOLDING_RATE_HIGH * 100) / 10000,
  );
}

export interface RewardInput {
  /** 報酬の額（税抜） */
  fee: number;
  /** 請求書の消費税の額（区分して書かれている場合） */
  consumptionTax: number;
  /** 費用の科目 */
  account: string;
}

export interface RewardResult {
  /** 源泉徴収の対象にした額 */
  base: number;
  tax: number;
  /** 振り込む額 */
  payment: number;
  /** 支払時の仕訳（税抜経理） */
  entry: JournalEntry;
  /** 翌月 10 日までの納付 */
  paymentEntry: JournalEntry;
}

/**
 * 報酬を支払うときの仕訳。請求書で消費税が区分されていれば、税抜の額を源泉徴収の対象にできる。
 */
export function rewardEntries({ fee, consumptionTax, account }: RewardInput): RewardResult {
  const base = fee;
  const tax = withholdingTax(base);
  const payment = fee + consumptionTax - tax;
  const lines: JournalEntry['lines'] = [
    { side: 'dr', account, amount: fee },
    { side: 'cr', account: '所得税預り金', amount: tax },
    { side: 'cr', account: '普通預金', amount: payment },
  ];
  if (consumptionTax)
    lines.splice(1, 0, { side: 'dr', account: '仮払消費税等', amount: consumptionTax });
  return {
    base,
    tax,
    payment,
    entry: {
      caption: '報酬を支払い、源泉所得税を差し引いた',
      lines: lines.filter((l) => l.amount),
    },
    paymentEntry: {
      caption: '翌月 10 日までに、源泉所得税を納める',
      lines: [
        { side: 'dr', account: '所得税預り金', amount: tax },
        { side: 'cr', account: '普通預金', amount: tax },
      ],
    },
  };
}
