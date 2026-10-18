/**
 * 会計基準の計算（プログラムが行う）: ポイントへの取引価格の配分、固定資産の減損、新しいリース会計基準の現在価値。
 */
import type { JournalEntry } from '../journal/types.ts';

const yen = (n: number) => n.toLocaleString('ja-JP');

export interface PointsInput {
  /** 販売価格（受け取った対価） */
  price: number;
  /** 付与したポイント（1 ポイント ＝ 1 円で使える） */
  points: number;
  /** 使われると見込む割合（%） */
  usageRate: number;
}

export interface PointsResult {
  /** ポイントの独立販売価格（ポイント × 使用見込み率） */
  pointsValue: number;
  revenue: number;
  contractLiability: number;
  entry: JournalEntry;
  error?: string;
}

/** 商品とポイントに、独立販売価格の比で取引価格を配分する（収益認識基準） */
export function allocatePoints({ price, points, usageRate }: PointsInput): PointsResult {
  if (
    ![price, points, usageRate].every((n) => Number.isInteger(n) && n >= 0) ||
    price === 0 ||
    usageRate > 100
  )
    return {
      pointsValue: 0,
      revenue: 0,
      contractLiability: 0,
      entry: { lines: [] },
      error: '販売価格は 1 以上、ポイントは 0 以上、使用見込み率は 0〜100 の整数にしてください',
    };
  const pointsValue = Math.floor((points * usageRate) / 100);
  const contractLiability = Math.round((price * pointsValue) / (price + pointsValue));
  const revenue = price - contractLiability;
  return {
    pointsValue,
    revenue,
    contractLiability,
    entry: {
      caption: `商品を ${yen(price)} 円で売り、${yen(points)} ポイントを付与した`,
      lines: [
        { side: 'dr', account: '現金', amount: price },
        { side: 'cr', account: '売上', amount: revenue },
        { side: 'cr', account: '契約負債', amount: contractLiability },
      ].filter((l) => l.amount) as JournalEntry['lines'],
    },
  };
}

export interface ImpairmentInput {
  /** 帳簿価額 */
  bookValue: number;
  /** 割引前の将来キャッシュ・フローの合計 */
  undiscounted: number;
  /** 正味売却価額（時価 − 処分費用） */
  netSellingPrice: number;
  /** 使用価値（将来キャッシュ・フローの現在価値） */
  valueInUse: number;
  /** 資産の科目 */
  account: string;
}

export interface ImpairmentResult {
  /** 減損損失を認識するか（割引前将来キャッシュ・フロー ＜ 帳簿価額） */
  recognized: boolean;
  recoverable: number;
  loss: number;
  entry: JournalEntry | null;
  steps: string[];
}

/** 固定資産の減損（兆候があるとして、認識の判定と測定を行う） */
export function impairment(input: ImpairmentInput): ImpairmentResult {
  const { bookValue, undiscounted, netSellingPrice, valueInUse, account } = input;
  const steps: string[] = [];
  const recognized = undiscounted < bookValue;
  steps.push(
    `認識の判定: 割引前将来キャッシュ・フロー ${yen(undiscounted)} ${recognized ? '＜' : '≧'} 帳簿価額 ${yen(bookValue)} → ${recognized ? '減損損失を認識する' : '減損損失を認識しない'}`,
  );
  if (!recognized) return { recognized, recoverable: 0, loss: 0, entry: null, steps };
  const recoverable = Math.max(netSellingPrice, valueInUse);
  steps.push(
    `回収可能価額: 正味売却価額 ${yen(netSellingPrice)} と使用価値 ${yen(valueInUse)} の高いほう ＝ ${yen(recoverable)}`,
  );
  const loss = Math.max(0, bookValue - recoverable);
  steps.push(
    `減損損失: 帳簿価額 ${yen(bookValue)} − 回収可能価額 ${yen(recoverable)} ＝ ${yen(loss)}`,
  );
  return {
    recognized,
    recoverable,
    loss,
    steps,
    entry: loss
      ? {
          caption: '減損損失を計上し、帳簿価額を直接減らした',
          lines: [
            { side: 'dr', account: '減損損失', amount: loss },
            { side: 'cr', account, amount: loss },
          ],
        }
      : null,
  };
}

export interface LeaseInput {
  /** 毎年のリース料（各年度末に支払う） */
  payment: number;
  /** リース期間（年） */
  years: number;
  /** 割引率（%。小数可） */
  rate: number;
}

export interface LeaseRow {
  year: number;
  opening: number;
  interest: number;
  principal: number;
  closing: number;
}

export interface LeaseResult {
  /** リース料の現在価値（リース負債・使用権資産の当初の額） */
  presentValue: number;
  schedule: LeaseRow[];
  /** 毎年の減価償却費（定額法・残存価額 0・リース期間） */
  depreciation: number;
  initial: JournalEntry;
  firstPayment: JournalEntry;
  error?: string;
}

/** 新しいリース会計基準の借り手の処理（学習用の簡単なモデル） */
export function leaseSchedule({ payment, years, rate }: LeaseInput): LeaseResult {
  const empty = {
    presentValue: 0,
    schedule: [],
    depreciation: 0,
    initial: { lines: [] },
    firstPayment: { lines: [] },
  };
  if (
    !Number.isInteger(payment) ||
    payment <= 0 ||
    !Number.isInteger(years) ||
    years < 1 ||
    years > 50 ||
    !(rate >= 0 && rate < 100)
  )
    return {
      ...empty,
      error: 'リース料は 1 以上、期間は 1〜50 年、割引率は 0 以上 100 未満にしてください',
    };
  const r = rate / 100;
  let pv = 0;
  for (let t = 1; t <= years; t++) pv += payment / (1 + r) ** t;
  const presentValue = Math.round(pv);
  const schedule: LeaseRow[] = [];
  let balance = presentValue;
  for (let year = 1; year <= years; year++) {
    // 最後の年は、端数を利息で調整して残高を 0 にする
    const interest = year === years ? payment - balance : Math.round(balance * r);
    const principal = payment - interest;
    schedule.push({ year, opening: balance, interest, principal, closing: balance - principal });
    balance -= principal;
  }
  const first = schedule[0];
  return {
    presentValue,
    schedule,
    depreciation: Math.floor(presentValue / years),
    initial: {
      caption: 'リースの開始日に、使用権資産とリース負債を計上した',
      lines: [
        { side: 'dr', account: '使用権資産', amount: presentValue },
        { side: 'cr', account: 'リース負債', amount: presentValue },
      ],
    },
    firstPayment: {
      caption: '1 年目の末に、リース料を支払った（利息と元本に分ける）',
      lines: [
        { side: 'dr', account: 'リース負債', amount: first.principal },
        { side: 'dr', account: '支払利息', amount: first.interest },
        { side: 'cr', account: '普通預金', amount: payment },
      ].filter((l) => l.amount) as JournalEntry['lines'],
    },
  };
}
