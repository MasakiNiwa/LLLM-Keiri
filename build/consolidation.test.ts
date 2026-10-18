import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildContent } from './content';
import { AccountBook } from '../src/lib/content/accounts';
import type { ConsolidationCase, ContentIndex } from '../src/lib/content/schema';
import { consolidate, translateEntity } from '../src/lib/consolidation/consolidate';

const { files } = buildContent(path.resolve(import.meta.dirname, '..'));
const index = JSON.parse(files.get('content/index.json')!) as ContentIndex;
const book = new AccountBook(index.accounts);
const load = (id: string) =>
  JSON.parse(files.get(`content/consolidation/${id}.json`)!) as ConsolidationCase;

describe('consolidate（国内子会社 80%）', () => {
  const c = load('domestic-80');
  const r = consolidate(c, book);
  const row = (a: string) => r.rows.find((x) => x.account === a);

  it('連結の当期純利益と、非支配株主・親会社株主への配分', () => {
    // P 200 + S 100 − のれん償却 10 − 未実現利益 10 ＝ 280、うち非支配株主 20
    expect(r.netIncome).toBe(280);
    expect(r.nciProfit).toBe(20);
    expect(r.parentNetIncome).toBe(260);
  });

  it('子会社株式は消え、のれん・非支配株主持分が残る', () => {
    expect(row('子会社株式')?.consolidated).toBe(0);
    expect(row('のれん')?.consolidated).toBe(190);
    expect(row('非支配株主持分')?.consolidated).toBe(-220);
    expect(row('売掛金')?.byElimination).toEqual({ balances: 100 * -1 });
  });

  it('連結貸借対照表の貸借が一致する', () => {
    const s = r.statements;
    expect(r.trialBalance.drTotal).toBe(r.trialBalance.crTotal);
    expect(s.totalAssets).toBe(s.totalLiabilities + s.totalEquity + s.netIncome);
  });

  it('修正仕訳を外すと、その分だけ変わる', () => {
    const without = consolidate(
      c,
      book,
      new Set(['capital', 'goodwill', 'nci-profit', 'sales', 'balances']),
    );
    expect(without.netIncome).toBe(290);
  });
});

describe('translateEntity', () => {
  it('円の会社はそのまま', () => {
    const r = translateEntity(load('domestic-80').entities[0], book);
    expect(r.translationAdjustment).toBe(0);
    expect(r.lines.every((l) => l.rate === 1)).toBe(true);
  });
});

describe('consolidate（米国子会社 80%）', () => {
  const c = load('us-subsidiary-80');
  const r = consolidate(c, book);
  const s = r.entities.find((e) => e.entity.id === 's')!;
  const row = (a: string) => r.rows.find((x) => x.account === a);

  it('資産・負債は CR、資本は HR、損益は AR で換算し、差額を為替換算調整勘定にする', () => {
    const line = (a: string) => s.lines.find((l) => l.account === a)!;
    expect(line('普通預金')).toMatchObject({ rateType: 'CR', jpy: 56000 });
    expect(line('資本金')).toMatchObject({ rateType: 'HR', jpy: -150000 });
    expect(line('売上')).toMatchObject({ rateType: 'AR', jpy: -174000 });
    expect(s.translationAdjustment).toBe(10500);
  });

  it('非支配株主持分は、子会社の純資産（決算日レート）の 20% になる', () => {
    expect(row('非支配株主持分')?.consolidated).toBe(-(1100 * 140 * 0.2));
    expect(row('為替換算調整勘定')?.consolidated).toBe(8400);
  });

  it('連結の当期純利益と貸借の一致', () => {
    expect(r.netIncome).toBe(34500);
    expect(r.nciProfit).toBe(2900);
    expect(r.parentNetIncome).toBe(31600);
    const st = r.statements;
    expect(st.totalAssets).toBe(st.totalLiabilities + st.totalEquity + st.netIncome);
  });
});

describe('consolidate（国内子会社 2 年目）', () => {
  const r = consolidate(load('domestic-80-year2'), book);
  const row = (a: string) => r.rows.find((x) => x.account === a);

  it('連結の当期純利益と配分', () => {
    // 290 + 150 − 受取配当金 40 − のれん 10 ＋ 前期の未実現利益の実現 10 − アップストリーム 15 ＝ 385
    expect(r.netIncome).toBe(385);
    // 30 − 3 ＝ 27
    expect(r.nciProfit).toBe(27);
    expect(r.parentNetIncome).toBe(358);
  });

  it('非支配株主持分は、S 社の資本（未実現利益を除く）の 20%', () => {
    // (資本金 800 ＋ 利益剰余金 250 ＋ 当期純利益 150 − 未実現利益 15) × 20% ＝ 237
    expect(row('非支配株主持分')?.consolidated).toBe(-237);
    expect(row('のれん')?.consolidated).toBe(180);
    expect(row('受取配当金')?.consolidated).toBe(0);
    expect(row('利益剰余金')?.consolidated).toBe(-1070);
  });

  it('貸借が一致する', () => {
    const st = r.statements;
    expect(st.totalAssets).toBe(st.totalLiabilities + st.totalEquity + st.netIncome);
  });
});
