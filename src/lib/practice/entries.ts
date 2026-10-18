/**
 * 経理の実務の仕訳をプログラムが作る（レッスンの中の計算の部品と、AI の説明の土台）。
 * 金額の計算はここで行い、AI には計算させない。
 */
import type { JournalEntry, JournalLine } from '../journal/types.ts';

const dr = (account: string, amount: number): JournalLine => ({ side: 'dr', account, amount });
const cr = (account: string, amount: number): JournalLine => ({ side: 'cr', account, amount });
const nonzero = (lines: JournalLine[]) => lines.filter((l) => l.amount !== 0);

export interface PayrollInput {
  /** 総支給額（差し引く前の給料） */
  gross: number;
  /** 源泉所得税 */
  incomeTax: number;
  /** 住民税（特別徴収） */
  residentTax: number;
  /** 社会保険料（従業員の負担分） */
  socialInsurance: number;
  /** 社会保険料の会社の負担分（省略すると従業員の負担分と同じ） */
  companyShare?: number;
}

export interface PayrollResult {
  /** 手取り額（振り込む額） */
  netPay: number;
  /** 給料日の仕訳 */
  payday: JournalEntry;
  /** 翌月 10 日までの源泉所得税・住民税の納付 */
  taxPayment: JournalEntry | null;
  /** 翌月末までの社会保険料の納付（従業員の負担分 ＋ 会社の負担分） */
  socialPayment: JournalEntry | null;
  /** 入力の問題（差し引く額が総支給額を超えるなど） */
  error?: string;
}

/** 給料の支払いと、預り金の納付の仕訳 */
export function payrollEntries(input: PayrollInput): PayrollResult {
  const { gross, incomeTax, residentTax, socialInsurance } = input;
  const company = input.companyShare ?? socialInsurance;
  const deductions = incomeTax + residentTax + socialInsurance;
  const netPay = gross - deductions;
  const amounts = [gross, incomeTax, residentTax, socialInsurance, company];
  if (amounts.some((n) => !Number.isInteger(n) || n < 0))
    return {
      netPay: 0,
      payday: { lines: [] },
      taxPayment: null,
      socialPayment: null,
      error: '金額は 0 以上の整数（円）で入れてください',
    };
  if (netPay < 0)
    return {
      netPay,
      payday: { lines: [] },
      taxPayment: null,
      socialPayment: null,
      error: '差し引く額の合計が、総支給額を超えています',
    };
  const payday: JournalEntry = {
    caption: `給料 ${gross.toLocaleString('ja-JP')} 円から差し引き、手取り ${netPay.toLocaleString('ja-JP')} 円を振り込む`,
    lines: nonzero([
      dr('給料', gross),
      cr('所得税預り金', incomeTax),
      cr('預り金', residentTax),
      cr('社会保険料預り金', socialInsurance),
      cr('普通預金', netPay),
    ]),
  };
  const taxTotal = incomeTax + residentTax;
  const taxPayment: JournalEntry | null = taxTotal
    ? {
        caption: '翌月 10 日までに、源泉所得税と住民税を納める',
        lines: nonzero([
          dr('所得税預り金', incomeTax),
          dr('預り金', residentTax),
          cr('普通預金', taxTotal),
        ]),
      }
    : null;
  const socialPayment: JournalEntry | null =
    socialInsurance + company
      ? {
          caption: '翌月末までに、社会保険料（従業員の負担分と会社の負担分）を納める',
          lines: nonzero([
            dr('社会保険料預り金', socialInsurance),
            dr('法定福利費', company),
            cr('普通預金', socialInsurance + company),
          ]),
        }
      : null;
  return { netPay, payday, taxPayment, socialPayment };
}

export type ShortfallReason = 'fee-self' | 'fee-customer' | 'partial';

export const SHORTFALL_REASONS: Record<ShortfallReason, string> = {
  'fee-self': '振込手数料（当社負担の取り決め）',
  'fee-customer': '振込手数料（得意先負担の取り決め）',
  partial: '一部だけの入金',
};

export interface CollectionInput {
  /** 請求額（売掛金） */
  billed: number;
  /** 入金額 */
  received: number;
  /** 入金が請求額より少ないときの理由 */
  reason: ShortfallReason;
}

export interface CollectionResult {
  entry: JournalEntry | null;
  /** 入金額と請求額の差の扱いの説明 */
  message: string;
  /** 売掛金の残り（消し込めなかった分） */
  remaining: number;
}

const yen = (n: number) => n.toLocaleString('ja-JP');

/** 入金消込の仕訳 */
export function collectionEntry(input: CollectionInput): CollectionResult {
  const { billed, received, reason } = input;
  if (![billed, received].every((n) => Number.isInteger(n) && n >= 0) || billed === 0)
    return { entry: null, message: '請求額と入金額を、円の整数で入れてください', remaining: 0 };
  const diff = billed - received;
  if (diff === 0)
    return {
      entry: { lines: [dr('普通預金', received), cr('売掛金', billed)] },
      message: '請求額どおりの入金。売掛金をすべて消し込みます',
      remaining: 0,
    };
  if (diff < 0)
    return {
      entry: { lines: [dr('普通預金', received), cr('売掛金', billed), cr('預り金', -diff)] },
      message: `請求額より ${yen(-diff)} 円多い入金です。二重払いなどの理由を得意先に確認し、返金するまで預り金にしておきます`,
      remaining: 0,
    };
  if (reason === 'fee-self')
    return {
      entry: { lines: [dr('普通預金', received), dr('支払手数料', diff), cr('売掛金', billed)] },
      message: `差額 ${yen(diff)} 円は、当社負担の振込手数料として支払手数料にし、売掛金はすべて消し込みます`,
      remaining: 0,
    };
  return {
    entry: received ? { lines: [dr('普通預金', received), cr('売掛金', received)] } : null,
    message:
      reason === 'fee-customer'
        ? `手数料は得意先の負担なので、差額 ${yen(diff)} 円は売掛金のまま残し、得意先に確認します`
        : `入金した分だけ消し込み、残りの ${yen(diff)} 円は売掛金のまま。得意先に理由を確認します`,
    remaining: diff,
  };
}
