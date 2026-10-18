import { describe, expect, it } from 'vitest';
import data from '../../data/holidays.json';
import { createHolidayLookup, parseHolidaysYml, type HolidayData } from './holidays';
import { buildSchedule, closedReason, nextBusinessDay } from './schedule';

const holidays = createHolidayLookup(data as HolidayData);

describe('経理の年間スケジュール', () => {
  const items = buildSchedule({ closingMonth: 3, start: '2026-04' });

  it('土日の期限は翌月曜にずらす', () => {
    // 2026-05-10 は日曜日
    expect(nextBusinessDay(new Date(2026, 4, 10)).getDate()).toBe(11);
    const wh = items.find((i) => i.title.startsWith('源泉所得税の納付（4 月'));
    expect(wh).toMatchObject({ dueDate: '2026-05-10', date: '2026-05-11' });
  });

  it('3 月決算: 確定申告は 5 月末、中間申告は 11 月末', () => {
    // 2026-05-31 は日曜日なので、6 月 1 日にずれる
    expect(items.find((i) => i.title.startsWith('法人税・消費税などの確定申告'))).toMatchObject({
      dueDate: '2026-05-31',
      date: '2026-06-01',
    });
    expect(items.find((i) => i.title.includes('中間申告'))?.dueDate).toBe('2026-11-30');
    expect(items.find((i) => i.title === '決算日')?.dueDate).toBe('2027-03-31');
  });

  it('12 月決算: 確定申告は 2 月末', () => {
    const d = buildSchedule({ closingMonth: 12, start: '2026-12', months: 3 });
    expect(d.find((i) => i.title.startsWith('法人税・消費税などの確定申告'))?.dueDate).toBe(
      '2027-02-28',
    );
  });

  it('納期の特例: 源泉所得税は 7 月 10 日と 1 月 20 日', () => {
    const s = buildSchedule({ closingMonth: 3, start: '2026-04', specialWithholding: true });
    const wh = s.filter((i) => i.title.startsWith('源泉所得税'));
    expect(wh.map((i) => i.dueDate)).toEqual(['2026-07-10', '2027-01-20']);
  });

  it('1 月 31 日の提出物', () => {
    expect(items.filter((i) => i.dueDate === '2027-01-31').map((i) => i.title)).toEqual(
      expect.arrayContaining(['償却資産の申告', '給与支払報告書の提出']),
    );
  });
});

describe('祝日', () => {
  it('holidays.yml を読む', () => {
    expect(parseHolidaysYml('---\n2026-01-01: 元日\n# x\n2026-01-12: 成人の日\n')).toEqual({
      '2026-01-01': '元日',
      '2026-01-12': '成人の日',
    });
  });
  it('同梱のデータ', () => {
    expect(holidays.nameOf('2026-10-12')).toBe('スポーツの日');
    expect(holidays.isOutOfRange('2060-01-01')).toBe(true);
  });
  it('祝日・年末年始は次の平日にずらす', () => {
    // 2026-10-12（月）はスポーツの日 → 10-13
    expect(nextBusinessDay(new Date(2026, 9, 10), holidays).getDate()).toBe(13);
    expect(closedReason(new Date(2026, 11, 30), holidays)).toBe('年末年始');
    const s = buildSchedule({ closingMonth: 3, start: '2026-10', months: 1, holidays });
    expect(s.find((i) => i.title.startsWith('源泉所得税'))).toMatchObject({
      dueDate: '2026-10-10',
      date: '2026-10-13',
      shiftedBecause: '土曜日',
    });
  });
});
