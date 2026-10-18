/**
 * 間接法のキャッシュ・フロー計算書（貸借対照表の増減から作る。プログラムが計算する）。
 *
 * 期首と期末の貸借対照表の科目ごとの増減を、営業・投資・財務の活動に振り分ける。
 * 貸借対照表は必ず貸借が一致するので、すべての増減を足すと「現金及び現金同等物の増減」と一致する。
 */
import type { AccountBook } from '../content/accounts.ts';
import type { Account } from '../content/schema.ts';

export type CashFlowSection = 'operating' | 'investing' | 'financing' | 'translation';

export const SECTION_LABELS: Record<CashFlowSection, string> = {
  operating: '営業活動によるキャッシュ・フロー',
  investing: '投資活動によるキャッシュ・フロー',
  financing: '財務活動によるキャッシュ・フロー',
  translation: '現金及び現金同等物に係る換算差額',
};

/** 現金及び現金同等物にする科目 */
const CASH = new Set(['現金', '小口現金', '当座預金', '普通預金']);
/** 投資活動にする流動資産 */
const INVESTING_CURRENT = new Set(['定期預金', '貸付金', '未収入金', '売買目的有価証券']);
/** 財務活動にする負債 */
const FINANCING_LIABILITIES = new Set(['借入金', 'リース債務']);
/** 損益（当期純利益）とつながる純資産の科目 */
const RETAINED = new Set(['利益剰余金', '繰越利益剰余金']);
const NCI = '非支配株主持分';
const TRANSLATION = '為替換算調整勘定';

export function isCash(name: string): boolean {
  return CASH.has(name);
}

/** 科目の増減を、どの活動に振り分けるか */
export function sectionFor(a: Pick<Account, 'name' | 'element' | 'group'>): CashFlowSection {
  if (a.name === TRANSLATION) return 'translation';
  if (a.element === 'asset') {
    if (a.group === '流動資産') return INVESTING_CURRENT.has(a.name) ? 'investing' : 'operating';
    // 減価償却累計額・のれんの減少は、お金の出ない費用の足し戻し（営業）。繰延税金資産もお金は動かない
    if (a.name === '減価償却累計額' || a.name === 'のれん' || a.name === '繰延税金資産')
      return 'operating';
    return 'investing';
  }
  if (a.element === 'liability')
    return FINANCING_LIABILITIES.has(a.name) ? 'financing' : 'operating';
  return 'financing';
}

export interface CashFlowLine {
  section: CashFlowSection;
  label: string;
  /** キャッシュの増加が正 */
  amount: number;
  /** もとになった科目（ドリルダウン用） */
  account?: string;
  opening?: number;
  closing?: number;
  /** どうしてこの金額になるかの説明 */
  explanation: string;
}

export interface CashFlowStatement {
  lines: CashFlowLine[];
  totals: Record<CashFlowSection, number>;
  openingCash: number;
  closingCash: number;
  /** 各区分の合計の和（＝ 期末 − 期首の現金になるはず） */
  netChange: number;
}

const yen = (n: number) => n.toLocaleString('ja-JP');

/**
 * opening・closing は貸借対照表の科目ごとの残高（借方が正）。
 * netIncome は当期純利益（非支配株主に帰属する分を差し引く前）、nciProfit は非支配株主に帰属する当期純利益。
 */
export function buildIndirectCashFlow(input: {
  opening: Map<string, number>;
  closing: Map<string, number>;
  netIncome: number;
  nciProfit?: number;
  book: AccountBook;
  /**
   * 在外子会社の換算の影響（あれば）。effects は科目ごとの「レートが変わったことによる残高の増減」（円・借方が正）、
   * nciShare は非支配株主持分の増減のうち換算差額の配分による分（借方が正）。
   * 各科目の増減から換算の影響を除き、まとめて「現金及び現金同等物に係る換算差額」にする。
   */
  translation?: { effects: Map<string, number>; nciShare: number };
}): CashFlowStatement {
  const { opening, closing, netIncome, book, translation } = input;
  const nciProfit = input.nciProfit ?? 0;
  const effects = translation?.effects ?? new Map<string, number>();
  const lines: CashFlowLine[] = [
    {
      section: 'operating',
      label: nciProfit ? '当期純利益（非支配株主に帰属する分を含む）' : '当期純利益',
      amount: netIncome,
      explanation: '間接法は、損益計算書の利益から始めて、お金が動かなかった分を調整していく',
    },
  ];
  const names = new Set([...opening.keys(), ...closing.keys()]);
  let openingCash = 0;
  let closingCash = 0;
  const order = new Map(book.accounts.map((a, i) => [a.name, i]));
  for (const name of [...names].sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9))) {
    const acc = book.find(name);
    if (!acc || acc.element === 'revenue' || acc.element === 'expense' || acc.element === 'other')
      continue;
    const o = opening.get(name) ?? 0;
    const c = closing.get(name) ?? 0;
    if (isCash(name)) {
      openingCash += o;
      closingCash += c;
      continue;
    }
    // 換算差額は、ほかの科目の換算の影響とあわせて最後にまとめる
    if (translation && name === TRANSLATION) continue;
    // 換算の影響（レートの変化だけで動いた分）は除く
    const effect = name === NCI ? (translation?.nciShare ?? 0) : (effects.get(name) ?? 0);
    const delta = c - o - effect;
    // 借方残高（資産）の増加はお金の減少、貸方残高（負債・純資産）の増加はお金の増加
    let amount = -delta;
    if (amount === 0 && !RETAINED.has(name) && name !== NCI) continue;
    const section = sectionFor(acc);
    let label: string;
    let explanation: string;
    if (RETAINED.has(name)) {
      // 利益剰余金の増減のうち、利益で増えた分は上の当期純利益で数えたので除く（残りは配当など）
      amount = -delta - (netIncome - nciProfit);
      if (amount === 0) continue;
      label = '配当金の支払額';
      explanation = `利益剰余金の増減（${yen(-delta)}）から、親会社株主に帰属する当期純利益（${yen(netIncome - nciProfit)}）を除いた分。株主への配当金の支払いなど`;
    } else if (name === NCI) {
      amount = -delta - nciProfit;
      if (amount === 0) continue;
      label = amount < 0 ? '非支配株主への配当金の支払額など' : '非支配株主からの払込みなど';
      explanation = `非支配株主持分の増減（${yen(-delta)}）から、非支配株主に帰属する当期純利益（${yen(nciProfit)}）を除いた分`;
    } else if (name === TRANSLATION) {
      label = '換算差額（為替換算調整勘定の増減）';
      explanation = '在外子会社の換算で生じた差額。お金の動きではないので、別に表示して合わせる';
    } else if (name === '減価償却累計額') {
      label = '減価償却費';
      explanation = `減価償却累計額が ${yen(-delta)} 増えた＝お金の出ない費用なので、利益に足し戻す`;
    } else if (name === 'のれん') {
      label = 'のれん償却額など';
      explanation = `のれんが ${yen(Math.abs(delta))} ${delta < 0 ? '減った（償却＝お金の出ない費用なので足し戻す）' : '増えた'}`;
    } else if (section === 'operating') {
      // 借方残高の科目（資産）か、貸方残高の科目（負債・評価勘定）か
      const debitNature = acc.element === 'asset' && !acc.contra;
      const inc = debitNature ? delta > 0 : delta < 0;
      label = `${name}の${inc ? '増加' : '減少'}額`;
      explanation = debitNature
        ? `${name}が ${yen(Math.abs(delta))} ${inc ? '増えた＝その分のお金はまだ入っていない（または先に払った）ので差し引く' : '減った＝回収・使用でお金になった分を足す'}`
        : acc.contra
          ? `${name}が ${yen(Math.abs(delta))} ${inc ? '増えた＝お金の出ない費用（繰入）の分なので足し戻す' : '減った＝お金の入らない収益（戻入）の分なので差し引く'}`
          : `${name}が ${yen(Math.abs(delta))} ${inc ? '増えた＝まだ払っていない分、お金が手元に残るので足す' : '減った＝支払った分を差し引く'}`;
    } else if (section === 'investing') {
      label = amount < 0 ? `${name}の取得による支出` : `${name}の売却・回収による収入`;
      explanation = `${name}が ${yen(Math.abs(delta))} ${delta > 0 ? '増えた（取得・貸付け）' : '減った（売却・回収）'}。簡単のため、増減をそのまま支出・収入とした`;
    } else {
      const inc = delta < 0;
      label =
        name === '資本金'
          ? '株式の発行による収入'
          : `${name}の${inc ? '増加（借入れ）' : '減少（返済）'}`;
      explanation = `${name}が ${yen(Math.abs(delta))} ${inc ? '増えた' : '減った'}`;
    }
    if (effect !== 0) explanation += `（換算による増減 ${yen(-effect)} は除き、換算差額に含めた）`;
    lines.push({ section, label, amount, account: name, opening: o, closing: c, explanation });
  }
  if (translation) {
    const deltaF = (closing.get(TRANSLATION) ?? 0) - (opening.get(TRANSLATION) ?? 0);
    const removed = [...effects.values()].reduce((s, v) => s + v, 0) + translation.nciShare;
    const amount = -deltaF - removed;
    if (amount !== 0)
      lines.push({
        section: 'translation',
        label: '現金及び現金同等物に係る換算差額',
        amount,
        account: TRANSLATION,
        opening: opening.get(TRANSLATION) ?? 0,
        closing: closing.get(TRANSLATION) ?? 0,
        explanation: `在外子会社のキャッシュ・フローは期中平均レート（資本の払込みなどは取引時のレート）で、期末の現金は決算日レートで換算する。その差が換算差額。為替換算調整勘定の増減（${yen(-deltaF)}）と非支配株主への配分（${yen(-translation.nciShare)}）から、現金以外の資産・負債の換算による増減（${yen(-[...effects.values()].reduce((s, v) => s + v, 0))}）を除いた分`,
      });
  }
  const totals = { operating: 0, investing: 0, financing: 0, translation: 0 } as Record<
    CashFlowSection,
    number
  >;
  for (const l of lines) totals[l.section] += l.amount;
  const netChange = totals.operating + totals.investing + totals.financing + totals.translation;
  return { lines, totals, openingCash, closingCash, netChange };
}
