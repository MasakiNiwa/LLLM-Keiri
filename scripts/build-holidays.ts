/**
 * 祝日データを作る: holiday-jp/holiday_jp の holidays.yml → src/data/holidays.json（アプリに同梱）。
 * 出典は、取得したときの master のコミット（SHA）に固定して記録する。
 *
 * 使い方: npm run holidays            （master の最新を取得）
 *         npm run holidays -- <SHA>    （コミットを指定）
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseHolidaysYml, type HolidayData } from '../src/lib/calendar/holidays.ts';

const REPO = 'https://github.com/holiday-jp/holiday_jp';
const root = path.resolve(import.meta.dirname, '..');

const sha =
  process.argv[2] ??
  execFileSync('git', ['ls-remote', REPO, 'refs/heads/master'], { encoding: 'utf8' }).split(
    /\s/,
  )[0];
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`コミットの SHA が正しくありません: ${sha}`);

const sourceUrl = `https://raw.githubusercontent.com/holiday-jp/holiday_jp/${sha}/holidays.yml`;
const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30_000) });
if (!res.ok) throw new Error(`取得できませんでした: ${res.status} ${sourceUrl}`);
const holidays = parseHolidaysYml(await res.text());
const dates = Object.keys(holidays).sort();
if (dates.length < 500) throw new Error(`祝日の数が少なすぎます（${dates.length}）`);
// 元日は毎年あるはず（データの欠けを見つける）
const firstYear = Number(dates[0].slice(0, 4));
const lastYear = Number(dates.at(-1)!.slice(0, 4));
for (let y = firstYear; y <= lastYear; y++)
  if (!holidays[`${y}-01-01`]) throw new Error(`${y} 年の元日がありません`);

const data: HolidayData = {
  meta: {
    source: 'holiday-jp/holiday_jp',
    sourceUrl,
    sourceSha: sha,
    fetchedAt: new Date().toISOString(),
    range: { from: `${firstYear}-01-01`, to: `${lastYear}-12-31` },
    count: dates.length,
  },
  holidays: Object.fromEntries(dates.map((d) => [d, holidays[d]])),
};
const out = path.join(root, 'src/data/holidays.json');
writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
console.log(
  `祝日 ${dates.length} 件（${firstYear}〜${lastYear} 年）を ${path.relative(root, out)} に書きました（${sha.slice(0, 7)}）`,
);
