/**
 * セグメント情報（プログラムが計算する）。
 *
 * 各社を segment（事業・地域の区分）にまとめ、売上高・セグメント利益（営業利益）・セグメント資産を出す。
 * セグメントの合計と連結の金額の差は「調整額」とし、どの連結修正仕訳から来たかの内訳を持つ。
 * 調整額は修正仕訳ごとの金額の合計なので、セグメントの合計 ＋ 調整額 ＝ 連結 が必ず成り立つ。
 */
import type { AccountBook } from '../content/accounts.ts';
import type { ConsolidationCase } from '../content/schema.ts';
import { readTrialBalance, type ConsolidationResult } from './consolidate.ts';

export type SegmentMetric = 'sales' | 'profit' | 'assets';

export const SEGMENT_METRICS: Record<SegmentMetric, string> = {
  sales: '売上高',
  profit: 'セグメント利益（営業利益）',
  assets: 'セグメント資産',
};

/** 営業利益に入る損益の区分 */
const OPERATING_GROUPS = new Set(['売上高', '売上原価', '販売費及び一般管理費']);

/** 科目ごとの残高（借方が正）から、指標の金額を出す */
export function metricOf(
  metric: SegmentMetric,
  balances: Map<string, number>,
  book: AccountBook,
): number {
  let v = 0;
  for (const [name, amount] of balances) {
    const a = book.find(name);
    if (!a) continue;
    if (metric === 'sales' && a.element === 'revenue' && a.group === '売上高') v -= amount;
    if (metric === 'profit' && OPERATING_GROUPS.has(a.group ?? '')) v -= amount;
    if (metric === 'assets' && a.element === 'asset') v += amount;
  }
  return v;
}

export interface Segment {
  name: string;
  entityIds: string[];
  /** 指標ごとの金額（各社の合計） */
  values: Record<SegmentMetric, number>;
  /** 売上高のうち、ほかのセグメントへの売上高 */
  intersegmentSales: number;
  /** 会社ごとの金額（ドリルダウン用） */
  byEntity: Record<string, Record<SegmentMetric, number>>;
}

export interface SegmentReport {
  segments: Segment[];
  /** 修正仕訳ごとの調整額（指標ごと） */
  adjustments: { eliminationId: string; values: Record<SegmentMetric, number> }[];
  adjustmentTotals: Record<SegmentMetric, number>;
  consolidated: Record<SegmentMetric, number>;
}

const METRICS = Object.keys(SEGMENT_METRICS) as SegmentMetric[];
const zero = (): Record<SegmentMetric, number> => ({ sales: 0, profit: 0, assets: 0 });

/** セグメントを書いていない事例では null */
export function segmentReport(
  c: ConsolidationCase,
  book: AccountBook,
  result: ConsolidationResult,
  enabled: ReadonlySet<string> = new Set(c.eliminations.map((e) => e.id)),
): SegmentReport | null {
  if (!c.entities.every((e) => e.segment)) return null;
  const segmentOf = new Map(c.entities.map((e) => [e.id, e.segment as string]));
  const segments = new Map<string, Segment>();
  for (const r of result.entities) {
    const name = r.entity.segment as string;
    const s = segments.get(name) ?? {
      name,
      entityIds: [],
      values: zero(),
      intersegmentSales: 0,
      byEntity: {},
    };
    s.entityIds.push(r.entity.id);
    const v = zero();
    for (const m of METRICS) {
      v[m] = metricOf(m, r.balances, book);
      s.values[m] += v[m];
    }
    s.byEntity[r.entity.id] = v;
    segments.set(name, s);
  }
  const adjustments: SegmentReport['adjustments'] = [];
  const adjustmentTotals = zero();
  for (const e of c.eliminations) {
    if (!enabled.has(e.id)) continue;
    const balances = readTrialBalance(e.shiwake, book);
    const values = zero();
    for (const m of METRICS) {
      values[m] = metricOf(m, balances, book);
      adjustmentTotals[m] += values[m];
    }
    adjustments.push({ eliminationId: e.id, values });
    // ちがうセグメントの会社どうしの売上の消去は、売り手のセグメントの「セグメント間の売上高」
    if (e.between) {
      const [seller, buyer] = e.between.map((id) => segmentOf.get(id));
      if (seller && buyer && seller !== buyer) {
        const s = segments.get(seller);
        if (s) s.intersegmentSales += -values.sales;
      }
    }
  }
  const consolidated = zero();
  for (const m of METRICS) {
    consolidated[m] =
      [...segments.values()].reduce((sum, s) => sum + s.values[m], 0) + adjustmentTotals[m];
  }
  return { segments: [...segments.values()], adjustments, adjustmentTotals, consolidated };
}
