/**
 * 日本の祝日（holiday-jp/holiday_jp の holidays.yml から作ったデータ。MIT License）。
 * データはビルドの前に scripts/build-holidays.ts で作り、src/data/holidays.json としてアプリに同梱する。
 * 起動時に取りに行かないので、オフラインでも使える。
 */

export interface HolidayData {
  meta: {
    source: string;
    sourceUrl: string;
    sourceSha: string;
    fetchedAt: string;
    range: { from: string; to: string };
    count: number;
  };
  /** YYYY-MM-DD → 祝日名 */
  holidays: Record<string, string>;
}

/** "2026-01-01: 元日" の形の行。名前にコロンが入ることがあるので、最初のコロンで分ける */
const LINE = /^(\d{4}-\d{2}-\d{2}):\s*(.+?)\s*$/;

export function parseHolidaysYml(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line === '---' || line.startsWith('#')) continue;
    const m = LINE.exec(line);
    if (!m) continue;
    const [, date, name] = m;
    if (date in out) throw new Error(`祝日の日付が重複しています: ${date}`);
    out[date] = name.replace(/^["'](.*)["']$/, '$1');
  }
  return out;
}

export interface HolidayLookup {
  /** 祝日名（祝日でなければ null） */
  nameOf(date: string): string | null;
  /** データの収録範囲の外か（範囲外は祝日かどうかわからない） */
  isOutOfRange(date: string): boolean;
  meta: HolidayData['meta'];
}

export function createHolidayLookup(data: HolidayData): HolidayLookup {
  const map = new Map(Object.entries(data.holidays));
  return {
    nameOf: (d) => map.get(d) ?? null,
    isOutOfRange: (d) => d < data.meta.range.from || d > data.meta.range.to,
    meta: data.meta,
  };
}
