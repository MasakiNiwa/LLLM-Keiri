/**
 * 資金繰り（プログラムが計算する）。
 * - 運転資金と CCC（キャッシュ・コンバージョン・サイクル）
 * - 月ごとの資金繰り表（売上の回収・仕入の支払いのずれを入れて、残高の不足を見つける）
 */

// ---------------- 運転資金と CCC ----------------

export interface WorkingCapitalInput {
  /** 年間の売上高 */
  sales: number;
  /** 年間の売上原価 */
  cogs: number;
  /** 売上債権（売掛金・受取手形など）の残高 */
  receivables: number;
  /** 棚卸資産の残高 */
  inventory: number;
  /** 仕入債務（買掛金・支払手形など）の残高 */
  payables: number;
}

export interface WorkingCapitalResult {
  /** 売上債権回転日数 */
  dso: number;
  /** 棚卸資産回転日数 */
  dio: number;
  /** 仕入債務回転日数 */
  dpo: number;
  /** CCC ＝ DSO ＋ DIO − DPO（日） */
  ccc: number;
  /** 必要運転資金 ＝ 売上債権 ＋ 棚卸資産 − 仕入債務 */
  workingCapital: number;
  /** 売上高が 10% 増えたときに増える必要運転資金（回転日数が同じとして） */
  increaseIfGrow10: number;
  error?: string;
}

const days = (balance: number, annual: number) => Math.round((balance / (annual / 365)) * 10) / 10;

export function workingCapital(i: WorkingCapitalInput): WorkingCapitalResult {
  if (
    !(i.sales > 0) ||
    !(i.cogs > 0) ||
    [i.receivables, i.inventory, i.payables].some((n) => !(n >= 0))
  )
    return {
      dso: 0,
      dio: 0,
      dpo: 0,
      ccc: 0,
      workingCapital: 0,
      increaseIfGrow10: 0,
      error: '売上高と売上原価は 1 以上、残高は 0 以上にしてください',
    };
  const dso = days(i.receivables, i.sales);
  const dio = days(i.inventory, i.cogs);
  const dpo = days(i.payables, i.cogs);
  const wc = i.receivables + i.inventory - i.payables;
  return {
    dso,
    dio,
    dpo,
    ccc: Math.round((dso + dio - dpo) * 10) / 10,
    workingCapital: wc,
    increaseIfGrow10: Math.round(wc * 0.1),
  };
}

// ---------------- 資金繰り表 ----------------

export interface CashPlanInput {
  months: number;
  /** 期首の現金預金 */
  openingCash: number;
  /** 1 か月目の売上高 */
  sales: number;
  /** 売上の月ごとの伸び（%） */
  growth: number;
  /** 売上のうち現金で回収する割合（%） */
  cashSalesRate: number;
  /** 掛け売上を回収するまでの月数（0〜3） */
  collectionLag: number;
  /** 売上原価率（%）。売上と同じ月に仕入れるとする */
  costRate: number;
  /** 仕入代金を支払うまでの月数（0〜3） */
  paymentLag: number;
  /** 毎月の経費（人件費・家賃など。その月に支払う） */
  expenses: number;
  /** 借入れ（入金する月と金額） */
  loanMonth: number;
  loanAmount: number;
  /** 毎月の返済額（借入れの翌月から） */
  repayment: number;
  /** 最低限残したい残高 */
  minimumCash: number;
}

export interface CashPlanRow {
  month: number;
  opening: number;
  sales: number;
  /** 経常収入（現金売上・売掛金の回収） */
  receipts: number;
  /** 経常支出（仕入代金・経費） */
  payments: number;
  operating: number;
  financing: number;
  closing: number;
  /** 損益（売上 − 原価 − 経費。資金とのずれを見るため） */
  profit: number;
  short: boolean;
}

export interface CashPlanResult {
  rows: CashPlanRow[];
  /** 残高が最低限を下回る最初の月（無ければ null） */
  firstShortMonth: number | null;
  totalProfit: number;
  cashChange: number;
}

/**
 * 月ごとの資金繰り表。表の前の月も 1 か月目と同じ売上だったとして、回収・支払いのずれを計算する。
 */
export function cashPlan(i: CashPlanInput): CashPlanResult {
  const n = Math.max(1, Math.min(24, Math.floor(i.months)));
  const salesOf = (m: number) => Math.round(i.sales * (1 + i.growth / 100) ** Math.max(0, m - 1));
  const rows: CashPlanRow[] = [];
  let cash = i.openingCash;
  let firstShortMonth: number | null = null;
  let totalProfit = 0;
  for (let m = 1; m <= n; m++) {
    const s = salesOf(m);
    const cashSales = Math.round((s * i.cashSalesRate) / 100);
    const credit = (k: number) => salesOf(k) - Math.round((salesOf(k) * i.cashSalesRate) / 100);
    const collected = credit(m - i.collectionLag);
    const purchasesPaid = Math.round((salesOf(m - i.paymentLag) * i.costRate) / 100);
    const receipts = cashSales + collected;
    const payments = purchasesPaid + i.expenses;
    const operating = receipts - payments;
    const financing =
      (m === i.loanMonth ? i.loanAmount : 0) -
      (i.loanAmount > 0 && m > i.loanMonth ? i.repayment : 0);
    const opening = cash;
    cash = opening + operating + financing;
    const profit = s - Math.round((s * i.costRate) / 100) - i.expenses;
    totalProfit += profit;
    const short = cash < i.minimumCash;
    if (short && firstShortMonth === null) firstShortMonth = m;
    rows.push({
      month: m,
      opening,
      sales: s,
      receipts,
      payments,
      operating,
      financing,
      closing: cash,
      profit,
      short,
    });
  }
  return { rows, firstShortMonth, totalProfit, cashChange: cash - i.openingCash };
}
