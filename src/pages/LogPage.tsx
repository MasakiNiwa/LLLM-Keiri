import { useMemo, useState } from 'react';
import {
  BookCheck,
  BookOpenText,
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  History,
  NotebookPen,
  PenLine,
  Sparkles,
  Target,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useLocation, useParams } from 'wouter';
import { Tabs } from '@/components/ui/Tabs';
import { WeaknessView } from '@/features/log/WeaknessView';
import { HistoryList } from '@/features/log/HistoryList';
import { useTitles } from '@/features/log/useTitles';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useFocus } from '@/features/ai/useFocus';
import holidayData from '@/data/holidays.json';
import { createHolidayLookup, type HolidayData } from '@/lib/calendar/holidays';
import { db } from '@/lib/db/db';
import { useReviewRecords } from '@/features/drill/reviewRepo';
import { dueByDate } from '@/lib/srs/review';
import { buildDailyLog, dateKey, dayScore, streak, type DayLog } from '@/lib/log/dailyLog';
import { cn } from '@/lib/utils/cn';

const holidays = createHolidayLookup(holidayData as HolidayData);
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
/** 学習の量に応じた色（0〜4 段階） */
const LEVELS = [
  '',
  'bg-accent-100 dark:bg-accent-900/40',
  'bg-accent-200 dark:bg-accent-800/60',
  'bg-accent-400 text-white dark:bg-accent-700',
  'bg-accent-600 text-white dark:bg-accent-500',
];
const level = (score: number) =>
  score === 0 ? 0 : score <= 2 ? 1 : score <= 5 ? 2 : score <= 10 ? 3 : 4;

function useDailyLog() {
  return useLiveQuery(async () => {
    const [activity, lessonProgress, attempts, journal, chat] = await Promise.all([
      db.activity.toArray(),
      db.lessonProgress.toArray(),
      db.drillAttempts.toArray(),
      db.journal.toArray(),
      db.chat.toArray(),
    ]);
    return buildDailyLog({ activity, lessonProgress, attempts, journal, chat });
  }, []);
}

function DayDetail({
  log,
  date,
  due,
  today,
}: {
  log?: DayLog;
  date: string;
  due: number;
  today: string;
}) {
  const titles = useTitles();
  const [y, m, d] = date.split('-').map(Number);
  const heading = `${m} 月 ${d} 日（${WEEK[new Date(y, m - 1, d).getDay()]}）`;
  const link = (id: string) => {
    const t = titles.get(id);
    return t ? (
      <Link href={t.href} className="text-accent-700 hover:underline dark:text-accent-300">
        {t.title}
      </Link>
    ) : (
      <span>{id}</span>
    );
  };
  const row = (icon: React.ReactNode, label: string, children: React.ReactNode) => (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-accent-600 dark:text-accent-400 [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500">{label}</div>
        {children}
      </div>
    </li>
  );
  return (
    <Card className="space-y-3 p-4">
      <h2 className="font-semibold">{heading}</h2>
      {due > 0 && date >= today && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <CalendarClock className="size-4 shrink-0" />
          {date === today ? (
            <Link href="/review" className="font-medium hover:underline">
              今日の復習 {due} 問（FSRS が決めた予定）→
            </Link>
          ) : (
            <span>復習の予定 {due} 問（FSRS が決めた予定。解いた結果で変わります）</span>
          )}
        </p>
      )}
      {date > today ? (
        due === 0 && <p className="text-sm text-slate-500">この日の復習の予定はありません。</p>
      ) : !log || dayScore(log) === 0 ? (
        <p className="text-sm text-slate-500">この日の学習の記録はありません。</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {log.lessonsRead.length > 0 &&
            row(
              <BookCheck />,
              '読んだレッスン',
              <ul className="space-y-0.5">
                {log.lessonsRead.map((id) => (
                  <li key={id}>{link(id)}</li>
                ))}
              </ul>,
            )}
          {log.lessonsReviewed.length > 0 &&
            row(
              <CalendarClock />,
              '復習したレッスン',
              <ul className="space-y-0.5">
                {log.lessonsReviewed.map((id) => (
                  <li key={id}>{link(id)}</li>
                ))}
              </ul>,
            )}
          {log.lessonsOpened.length > 0 &&
            row(
              <BookOpenText />,
              '開いたレッスン',
              <ul className="space-y-0.5">
                {log.lessonsOpened.map((id) => (
                  <li key={id}>{link(id)}</li>
                ))}
              </ul>,
            )}
          {log.drills.length > 0 &&
            row(
              <PenLine />,
              `答え合わせ ${log.attempts} 回（正解 ${log.correct}）`,
              <ul className="space-y-0.5">
                {log.drills.map((s) => (
                  <li key={s.setId}>
                    {link(s.setId)}{' '}
                    <span className="text-xs text-slate-500 tabular-nums">
                      {s.correct}/{s.tried}
                    </span>
                  </li>
                ))}
              </ul>,
            )}
          {log.journal > 0 &&
            row(
              <NotebookPen />,
              '帳簿',
              <Link href="/ledger" className="text-accent-700 hover:underline dark:text-accent-300">
                仕訳を {log.journal} 件入れた
              </Link>,
            )}
          {log.questions > 0 &&
            row(
              <Sparkles />,
              'AI',
              <Link href="/chat" className="text-accent-700 hover:underline dark:text-accent-300">
                AI に {log.questions} 回質問した
              </Link>,
            )}
        </ul>
      )}
    </Card>
  );
}

type Tab = 'calendar' | 'history' | 'weakness';
const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'calendar', label: 'カレンダー', icon: <CalendarDays /> },
  { value: 'history', label: '履歴', icon: <History /> },
  { value: 'weakness', label: '苦手の分析', icon: <Target /> },
];

export default function LogPage() {
  const params = useParams<{ tab?: string }>();
  const [, navigate] = useLocation();
  const tab: Tab = TABS.some((t) => t.value === params.tab) ? (params.tab as Tab) : 'calendar';
  return (
    <>
      <PageHeader title="学習の記録" />
      <PageBody>
        <Tabs
          value={tab}
          items={TABS}
          onChange={(t) => navigate(t === 'calendar' ? '/log' : `/log/${t}`, { replace: true })}
        />
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'history' && <HistoryList />}
        {tab === 'weakness' && <WeaknessView />}
      </PageBody>
    </>
  );
}

function CalendarTab() {
  const days = useDailyLog();
  const [today] = useState(() => dateKey(Date.now()));
  const reviews = useReviewRecords();
  const [now] = useState(() => Date.now());
  const dues = useMemo(() => dueByDate(reviews ?? [], now), [reviews, now]);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const count = new Date(y, m, 0).getDate();
  const cells = [
    ...Array<null>(first.getDay()).fill(null),
    ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];
  const monthDays = [...(days?.values() ?? [])].filter((d) => d.date.startsWith(month));
  const studied = monthDays.filter((d) => dayScore(d) > 0).length;
  const attempts = monthDays.reduce((s, d) => s + d.attempts, 0);
  const correct = monthDays.reduce((s, d) => s + d.correct, 0);
  const read = monthDays.reduce((s, d) => s + d.lessonsRead.length, 0);
  const st = days ? streak(days) : 0;
  const shift = (k: number) => {
    const d = new Date(y, m - 1 + k, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  useFocus({
    kind: 'other',
    page: `学習の記録（連続 ${st} 日。${m} 月は ${studied} 日学習、答え合わせ ${attempts} 回・正解 ${correct}、読んだレッスン ${read}）`,
  });

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: '連続',
            value: `${st} 日`,
            icon: <Flame className="size-4 text-orange-500" />,
          },
          { label: `${m} 月の学習日`, value: `${studied} 日` },
          {
            label: `${m} 月の答え合わせ`,
            value: attempts ? `${correct}/${attempts}` : '0',
          },
        ].map((c) => (
          <Card key={c.label} className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
              {c.icon}
              {c.label}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{c.value}</div>
          </Card>
        ))}
      </div>
      <Card className="p-3 sm:p-4">
        <div className="mb-2 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="前の月">
            <ChevronLeft />
          </Button>
          <h2 className="flex-1 text-center font-semibold">
            {y} 年 {m} 月
          </h2>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="次の月">
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {WEEK.map((w, i) => (
            <div
              key={w}
              className={cn(
                'py-1 text-slate-500',
                i === 0 && 'text-rose-500',
                i === 6 && 'text-sky-600',
              )}
            >
              {w}
            </div>
          ))}
          {cells.map((c, i) =>
            c === null ? (
              <div key={`e${i}`} />
            ) : (
              <button
                key={c}
                type="button"
                onClick={() => setSelected(c)}
                aria-pressed={selected === c}
                aria-label={`${Number(c.slice(8))} 日${holidays.nameOf(c) ? `（${holidays.nameOf(c)}）` : ''}`}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular-nums transition',
                  LEVELS[level(dayScore(days?.get(c)))],
                  level(dayScore(days?.get(c))) === 0 &&
                    (new Date(c).getDay() === 0 || holidays.nameOf(c)) &&
                    'text-rose-500',
                  selected === c &&
                    'ring-2 ring-accent-500 ring-offset-1 dark:ring-offset-slate-900',
                  c === today && 'font-bold underline underline-offset-2',
                  c > today && !dues.get(c) && 'opacity-40',
                )}
              >
                {Number(c.slice(8))}
                {c >= today && (dues.get(c) ?? 0) > 0 && (
                  <span className="text-[0.55rem] leading-none font-semibold text-amber-600 dark:text-amber-400">
                    復{dues.get(c)}
                  </span>
                )}
              </button>
            ),
          )}
        </div>
        <div className="mt-3 flex items-center justify-end gap-1 text-xs text-slate-500">
          少ない
          {LEVELS.map((cls, i) => (
            <span
              key={i}
              className={cn('size-3 rounded-sm border border-slate-200 dark:border-slate-700', cls)}
            />
          ))}
          多い
        </div>
      </Card>
      <DayDetail
        log={days?.get(selected)}
        date={selected}
        due={dues.get(selected) ?? 0}
        today={today}
      />
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        レッスンを開いた・読んだ日、問題の答え合わせ、帳簿の仕訳、AI
        への質問を、日付ごとに表示します（この端末の記録）。日付を押すと、その日に学んだことが出ます。今日から先の日の「復◯」は、記憶のアルゴリズム（FSRS）が決めた復習の予定の数です。
      </p>
    </>
  );
}
