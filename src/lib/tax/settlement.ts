/**
 * 決算での消費税の精算（税抜経理）。学習用に、仮受消費税等・仮払消費税等の残高から納付額を出す。
 * 実際の申告では、課税標準額から国税（7.8%）と地方消費税を順に計算するので、端数で少しずれることがある。
 */
import type { JournalEntry, JournalLine } from '../journal/types.ts';

/** 簡易課税の事業区分とみなし仕入率（%） */
export const DEEMED_RATES = {
  1: { label: '第 1 種（卸売業）', rate: 90 },
  2: { label: '第 2 種（小売業など）', rate: 80 },
  3: { label: '第 3 種（製造業など）', rate: 70 },
  4: { label: '第 4 種（飲食店業など）', rate: 60 },
  5: { label: '第 5 種（サービス業など）', rate: 50 },
  6: { label: '第 6 種（不動産業）', rate: 40 },
} as const;
export type BusinessType = keyof typeof DEEMED_RATES;

export interface SettlementInput {
  /** 仮受消費税等の残高 */
  received: number;
  /** 仮払消費税等の残高 */
  paid: number;
  /** 一般課税（原則）か簡易課税か */
  method: 'general' | 'simplified';
  businessType?: BusinessType;
}

export interface SettlementResult {
  /** 納付する額（マイナスなら還付） */
  payable: number;
  /** 控除する額（一般課税は仮払の額、簡易課税は預かった額 × みなし仕入率） */
  deductible: number;
  entry: JournalEntry;
  /** 仮受と仮払の差と、納付額の差（簡易課税では雑益・雑損） */
  difference: number;
}

export function consumptionTaxSettlement(input: SettlementInput): SettlementResult {
  const { received, paid, method } = input;
  const rate = DEEMED_RATES[input.businessType ?? 5].rate;
  const deductible = method === 'general' ? paid : Math.floor((received * rate) / 100);
  const payable = received - deductible;
  const difference = received - paid - payable;
  const lines: JournalLine[] = [
    { side: 'dr', account: '仮受消費税等', amount: received },
    { side: 'cr', account: '仮払消費税等', amount: paid },
  ];
  if (payable > 0) lines.push({ side: 'cr', account: '未払消費税等', amount: payable });
  if (payable < 0) lines.push({ side: 'dr', account: '未収入金', amount: -payable });
  // 簡易課税では、実際に支払った消費税（仮払）とみなしの控除額の差が損益になる
  if (difference > 0) lines.push({ side: 'cr', account: '雑益', amount: difference });
  if (difference < 0) lines.push({ side: 'dr', account: '雑損', amount: -difference });
  return {
    payable,
    deductible,
    difference,
    entry: {
      caption: '決算で、仮受消費税等と仮払消費税等を精算した',
      lines: lines.filter((l) => l.amount),
    },
  };
}
