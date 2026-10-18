/**
 * 法人税の所得の計算（別表四の簡単な形）。プログラムが計算する。
 *
 * 所得金額 ＝ 当期利益 ＋ 加算 − 減算。
 * 各項目は「留保」（会社の中に残る。別表五(一)の利益積立金額に引き継ぐ）と
 * 「社外流出」（配当・交際費など会社の外に出たもの）に分ける。総額 ＝ 留保 ＋ 社外流出。
 */

export type Disposition = 'retained' | 'outflow';

export interface Beppyo4Item {
  label: string;
  amount: number;
  kind: 'add' | 'deduct';
  disposition: Disposition;
}

export interface Beppyo4Row {
  label: string;
  total: number;
  retained: number;
  outflow: number;
  kind?: 'add' | 'deduct';
}

export interface Beppyo4Result {
  rows: Beppyo4Row[];
  addTotal: Beppyo4Row;
  deductTotal: Beppyo4Row;
  income: Beppyo4Row;
  /** 課税標準（1,000 円未満切り捨て） */
  taxableIncome: number;
  /** 法人税額（100 円未満切り捨て。軽減税率・税額控除は考えない） */
  tax: number;
}

const row = (
  label: string,
  total: number,
  retained: number,
  kind?: 'add' | 'deduct',
): Beppyo4Row => ({
  label,
  total,
  retained,
  outflow: total - retained,
  kind,
});

export function beppyo4(input: {
  netIncome: number;
  /** 当期利益のうち、配当として社外に出た額 */
  dividends: number;
  items: Beppyo4Item[];
  /** 税率（%） */
  rate: number;
}): Beppyo4Result {
  const { netIncome, dividends, items, rate } = input;
  const rows: Beppyo4Row[] = [row('当期利益', netIncome, netIncome - dividends)];
  const sum = (kind: 'add' | 'deduct') => {
    const xs = items.filter((i) => i.kind === kind && i.amount);
    for (const i of xs)
      rows.push(row(i.label, i.amount, i.disposition === 'retained' ? i.amount : 0, kind));
    const total = xs.reduce((s, i) => s + i.amount, 0);
    const retained = xs
      .filter((i) => i.disposition === 'retained')
      .reduce((s, i) => s + i.amount, 0);
    return row(kind === 'add' ? '加算 小計' : '減算 小計', total, retained);
  };
  const addTotal = sum('add');
  const deductTotal = sum('deduct');
  const income = row(
    '所得金額',
    netIncome + addTotal.total - deductTotal.total,
    netIncome - dividends + addTotal.retained - deductTotal.retained,
  );
  const taxableIncome = Math.max(0, Math.floor(income.total / 1000) * 1000);
  const tax = Math.floor((taxableIncome * rate) / 100 / 100) * 100;
  return { rows, addTotal, deductTotal, income, taxableIncome, tax };
}
