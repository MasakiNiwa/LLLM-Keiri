import { useMemo, useState } from 'react';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { useFocus } from '@/features/ai/useFocus';
import { useContentIndex } from '@/features/content/contentStore';
import { useSettings } from '@/features/settings/settingsStore';
import {
  buildSchedule,
  SCHEDULE_CATEGORIES,
  type ScheduleCategory,
  type ScheduleItem,
} from '@/lib/calendar/schedule';
import { cn } from '@/lib/utils/cn';
import holidayData from '@/data/holidays.json';
import { createHolidayLookup, type HolidayData } from '@/lib/calendar/holidays';

const holidays = createHolidayLookup(holidayData as HolidayData);

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const CATEGORY_STYLE: Record<ScheduleCategory, string> = {
  closing: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  tax: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  payroll: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  social: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  monthly: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function parse(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}
function label(d: string) {
  const x = parse(d);
  return `${x.getMonth() + 1}/${x.getDate()}（${WEEK[x.getDay()]}）`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ItemRow({ item, past }: { item: ScheduleItem; past: boolean }) {
  const { index } = useContentIndex();
  const lesson = item.lesson ? index?.lessons.find((l) => l.id === item.lesson) : undefined;
  return (
    <li className={cn('flex gap-3 px-4 py-3', past && 'opacity-50')}>
      <span className="w-24 shrink-0 font-mono text-sm whitespace-nowrap tabular-nums">
        {label(item.date)}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.title}</span>
          <span className={cn('rounded-md px-1.5 py-0.5 text-xs', CATEGORY_STYLE[item.category])}>
            {SCHEDULE_CATEGORIES[item.category]}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {item.description}
          {item.from && `（${label(item.from)} から）`}
          {item.date !== item.dueDate &&
            `（期限の ${label(item.dueDate)} が休み（${item.shiftedBecause}）のため、次の平日）`}
        </p>
        {lesson && (
          <Link
            href={`/learn/${lesson.id}`}
            className="inline-flex items-center gap-0.5 text-xs text-accent-700 hover:underline dark:text-accent-300"
          >
            レッスン「{lesson.title}」
            <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>
    </li>
  );
}

/** その月の祝日 */
function MonthHolidays({ ym }: { ym: string }) {
  const [y, m] = ym.split('-').map(Number);
  const days: string[] = [];
  for (let d = 1; d <= new Date(y, m, 0).getDate(); d++) {
    const ds = `${ym}-${String(d).padStart(2, '0')}`;
    const name = holidays.nameOf(ds);
    if (name) days.push(`${d} 日 ${name}`);
  }
  if (!days.length) return null;
  return (
    <span className="mt-0.5 block text-xs font-normal text-rose-600 dark:text-rose-400">
      祝日: {days.join('、')}
    </span>
  );
}

export default function CalendarPage() {
  const closingMonth = useSettings((s) => s.closingMonth);
  const special = useSettings((s) => s.specialWithholding);
  const update = useSettings((s) => s.update);
  const [hidden, setHidden] = useState<Set<ScheduleCategory>>(new Set());
  const today = todayStr();
  const start = today.slice(0, 7);
  const items = useMemo(
    () => buildSchedule({ closingMonth, start, months: 12, specialWithholding: special, holidays }),
    [closingMonth, start, special],
  );
  const shown = items.filter((i) => !hidden.has(i.category));
  const next = shown.filter((i) => i.date >= today).slice(0, 3);
  useFocus({
    kind: 'other',
    page: `経理カレンダー（${closingMonth} 月決算。直近の期限: ${next.map((n) => `${n.date} ${n.title}`).join('、')}）`,
  });
  const byMonth = new Map<string, ScheduleItem[]>();
  for (const i of shown)
    byMonth.set(i.date.slice(0, 7), [...(byMonth.get(i.date.slice(0, 7)) ?? []), i]);

  return (
    <>
      <PageHeader title="経理カレンダー" />
      <PageBody>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          決算月から、決算・申告・納付・給与・社会保険の主な期限をプログラムが計算します。今月から 1
          年分を表示します。
        </p>
        <Card className="space-y-3 p-4">
          <label className="flex items-center gap-3 text-sm">
            <span className="flex-1">決算月</span>
            <Select
              value={String(closingMonth)}
              onChange={(v) => update({ closingMonth: Number(v) })}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: String(i + 1),
                label: `${i + 1} 月`,
              }))}
              className="w-28"
            />
          </label>
          <div className="flex items-center gap-3 text-sm">
            <label htmlFor="special-wh" className="flex-1">
              源泉所得税の納期の特例を受けている
              <span className="block text-xs text-slate-500">
                給与の支払いを受ける人が常時 10 人未満で、届け出ている場合（年 2 回の納付）
              </span>
            </label>
            <Switch
              id="special-wh"
              checked={special}
              onChange={(v) => update({ specialWithholding: v })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SCHEDULE_CATEGORIES) as ScheduleCategory[]).map((c) => (
              <Chip
                key={c}
                active={!hidden.has(c)}
                onClick={() => {
                  const s = new Set(hidden);
                  if (s.has(c)) s.delete(c);
                  else s.add(c);
                  setHidden(s);
                }}
              >
                {SCHEDULE_CATEGORIES[c]}
              </Chip>
            ))}
          </div>
        </Card>
        {next.length > 0 && (
          <Card className="border-accent-300 p-4 dark:border-accent-800">
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <CalendarClock className="size-5 text-accent-600" />
              次の期限
            </h2>
            <ul className="space-y-1 text-sm">
              {next.map((n) => (
                <li key={n.date + n.title} className="flex gap-3">
                  <span className="w-24 shrink-0 font-mono whitespace-nowrap tabular-nums">
                    {label(n.date)}
                  </span>
                  <span>{n.title}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
        {[...byMonth].map(([ym, list]) => (
          <Card key={ym} className="overflow-hidden">
            <h2 className="bg-slate-50 px-4 py-2 font-semibold dark:bg-slate-800/50">
              {Number(ym.slice(0, 4))} 年 {Number(ym.slice(5))} 月
              <MonthHolidays ym={ym} />
            </h2>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map((i) => (
                <ItemRow key={i.date + i.title} item={i} past={i.date < today} />
              ))}
            </ul>
          </Card>
        ))}
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          主な期限の目安です。土日・祝日・年末年始（12 月 29 日〜1 月 3
          日）にあたる期限は、次の平日にずらしています（祝日は holiday-jp/holiday_jp のデータ。
          {holidays.meta.range.to.slice(0, 4)}
          年まで）。会社の規模・届出・自治体によって違うものもあるので、実際の期限は税務署・年金事務所・市区町村などの案内で必ず確かめてください。
        </p>
      </PageBody>
    </>
  );
}
