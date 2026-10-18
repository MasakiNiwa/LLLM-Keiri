import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AccountBook } from '../src/lib/content/accounts';
import type { ClosingExercise, ContentIndex } from '../src/lib/content/schema';
import { buildWorksheet } from '../src/lib/closing/worksheet';
import { parseShiwake } from '../src/lib/journal/parse';
import { buildContent } from './content';

const { files } = buildContent(path.resolve(import.meta.dirname, '..'));
const index = JSON.parse(files.get('content/index.json')!) as ContentIndex;
const book = new AccountBook(index.accounts);
const lines = (s: string) => parseShiwake(s).entries.flatMap((e) => e.lines);

describe.each(index.exercises.map((e) => [e.id] as const))('決算の総合演習 %s', (id) => {
  const ex = JSON.parse(files.get(`content/exercises/${id}.json`)!) as ClosingExercise;
  const ws = buildWorksheet(
    lines(ex.trialBalance),
    ex.adjustments.map((a) => lines(a.answer)),
    book,
  );
  it('精算表の各欄の貸借が一致する（損益計算書・貸借対照表は当期純利益で合う）', () => {
    expect(ws.totals.tbDr).toBe(ws.totals.tbCr);
    expect(ws.totals.adjDr).toBe(ws.totals.adjCr);
    expect(ws.totals.plCr - ws.totals.plDr).toBe(ws.totals.bsDr - ws.totals.bsCr);
  });
});

describe('商品売買業の決算', () => {
  const ex = JSON.parse(files.get('content/exercises/shop-closing.json')!) as ClosingExercise;
  const ws = buildWorksheet(
    lines(ex.trialBalance),
    ex.adjustments.map((a) => lines(a.answer)),
    book,
  );
  const row = (a: string) => ws.rows.find((r) => r.account === a)!;
  it('当期純利益と主な残高', () => {
    expect(ws.netIncome).toBe(209000);
    expect(row('仕入').plDr).toBe(3770000);
    expect(row('繰越商品').bsDr).toBe(150000);
    expect(row('貸倒引当金').bsCr).toBe(12000);
    expect(row('未払費用').bsCr).toBe(7500);
  });
  it('整理を一部だけ反映しても、各欄の貸借は合う', () => {
    const part = buildWorksheet(lines(ex.trialBalance), [lines(ex.adjustments[0].answer)], book);
    expect(part.totals.plCr - part.totals.plDr).toBe(part.totals.bsDr - part.totals.bsCr);
  });
});

describe('簿記 2 級レベルの決算', () => {
  const ex = JSON.parse(
    files.get('content/exercises/bookkeeping2-closing.json')!,
  ) as ClosingExercise;
  const ws = buildWorksheet(
    lines(ex.trialBalance),
    ex.adjustments.map((a) => lines(a.answer)),
    book,
  );
  const row = (a: string) => ws.rows.find((r) => r.account === a)!;
  it('当期純利益と主な残高', () => {
    expect(ws.netIncome).toBe(1211000);
    expect(row('繰越商品').bsDr).toBe(456000);
    expect(row('リース債務').bsCr).toBe(400000);
    expect(row('その他有価証券評価差額金').bsCr).toBe(35000);
    expect(row('減価償却累計額').bsCr).toBe(2820000);
  });
});

describe('製造業の決算', () => {
  const ex = JSON.parse(
    files.get('content/exercises/manufacturing-closing.json')!,
  ) as ClosingExercise;
  const ws = buildWorksheet(
    lines(ex.trialBalance),
    ex.adjustments.map((a) => lines(a.answer)),
    book,
  );
  const row = (a: string) => ws.rows.find((r) => r.account === a);
  it('当期純利益と主な残高（原価計算の勘定は残らない）', () => {
    expect(ws.netIncome).toBe(2328200);
    expect(row('売上原価')!.plDr).toBe(6850000);
    expect(row('材料')!.bsDr).toBe(400000);
    expect(row('仕掛品')!.bsDr).toBe(300000);
    expect(row('製品')!.bsDr).toBe(450000);
    for (const a of ['賃金', '製造間接費', '原価差異']) {
      const r = row(a)!;
      expect(r.bsDr + r.bsCr + r.plDr + r.plCr).toBe(0);
    }
  });
});

describe('連結精算表', () => {
  const ex = JSON.parse(
    files.get('content/exercises/consolidation-worksheet.json')!,
  ) as ClosingExercise;
  const ws = buildWorksheet(
    lines(ex.trialBalance),
    ex.adjustments.map((a) => lines(a.answer)),
    book,
  );
  const row = (a: string) => ws.rows.find((r) => r.account === a);
  it('親会社株主に帰属する当期純利益と非支配株主持分', () => {
    expect(ws.netIncome).toBe(2156000);
    expect(row('非支配株主持分')!.bsCr).toBe(1060000);
    expect(row('のれん')!.bsDr).toBe(360000);
    expect(row('子会社株式')!.bsDr).toBe(0);
    expect(row('利益剰余金')!.bsCr).toBe(2000000);
    expect(row('売掛金')!.bsDr).toBe(4200000);
  });
});
