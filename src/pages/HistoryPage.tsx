import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookCheck,
  BookOpenText,
  CalendarClock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useParams } from 'wouter';
import { BackButton } from '@/app/BackButton';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { useFocus } from '@/features/ai/useFocus';
import { loader, type ReviewItem } from '@/features/drill/reviewItems';
import { LESSON_GRADES } from '@/features/learn/progress';
import { fmtDate, useHistory, useTargetTitle } from '@/features/log/useHistory';
import { db } from '@/lib/db/db';
import { isDue } from '@/lib/srs/review';
import { cn } from '@/lib/utils/cn';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const dayLabel = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
};
const gradeLabel = (g: number) => LESSON_GRADES.find((x) => x.grade === g)?.label ?? '';

const textOf = (it: ReviewItem | null | undefined) =>
  !it
    ? undefined
    : it.kind === 'shiwake'
      ? it.question.question
      : it.kind === 'choice'
        ? it.question
        : it.kind === 'rcm'
          ? it.risk.risk
          : it.title;

/** 問題の id から問題文を引く（読めなければ id のまま） */
function useQuestionTexts(setId: string | null, ids: string[]) {
  const [texts, setTexts] = useState<Map<string, string>>(new Map());
  const key = ids.join('\u0000');
  useEffect(() => {
    if (!setId || !ids.length) return;
    let stale = false;
    loader(setId)
      .then((get) => {
        if (stale) return;
        const m = new Map<string, string>();
        for (const id of ids) {
          const t = textOf(get(id));
          if (t) m.set(id, t);
        }
        setTexts(m);
      })
      .catch(() => undefined);
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId, key]);
  return texts;
}

/** 学習対象ひとつの履歴（学習した日の一覧と結果、問題ごとの成績、次の復習） */
export default function HistoryPage() {
  const { id: raw = '' } = useParams<{ id: string }>();
  const id = decodeURIComponent(raw);
  const history = useHistory();
  const titleOf = useTargetTitle();
  const h = history?.get(id);
  const { title, href } = titleOf(id);
  const [now] = useState(() => Date.now());
  // 問題の答え合わせは、レッスンなら確認問題（lesson:<id>）、それ以外はその setId
  const setId = h && h.triedQuestions > 0 ? id : null;
  const cards = useLiveQuery(
    () =>
      id.startsWith('lesson:')
        ? db.reviews.where('setId').anyOf('read', id).toArray()
        : db.reviews.where('setId').equals(id).toArray(),
    [id],
  );
  const perQuestion = useMemo(() => {
    const m = new Map<string, { tried: number; correct: number; last?: boolean }>();
    if (!h) return m;
    for (const d of [...h.log].reverse())
      for (const q of d.questions) {
        const s = m.get(q.questionId) ?? { tried: 0, correct: 0 };
        s.tried++;
        const ok = q.correct && !q.revealed;
        if (ok) s.correct++;
        s.last = ok;
        m.set(q.questionId, s);
      }
    return m;
  }, [h]);
  const texts = useQuestionTexts(setId, [...perQuestion.keys()]);
  const dueOf = (qid: string) =>
    cards?.find((c) => c.setId !== 'read' && c.questionId === qid)?.due;
  const lessonCard = cards?.find((c) => c.setId === 'read');
  useFocus({
    kind: 'other',
    page: h
      ? `学習の履歴「${title}」（学習 ${h.days} 回、最後 ${fmtDate(h.lastAt)}${h.triedQuestions ? `、正解 ${h.correctNow}/${h.triedQuestions}` : ''}）`
      : '学習の履歴',
  });

  return (
    <>
      <PageHeader title={title} back={<BackButton to="/log/history" label="履歴へ" />} />
      <PageBody>
        {!history && <p className="text-sm text-slate-500">読み込み中…</p>}
        {history && !h && <p className="text-sm text-slate-500">この対象の記録はありません。</p>}
        {h && (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: '学習した回数', value: `${h.days} 回` },
                { label: 'はじめて', value: fmtDate(h.firstAt) },
                { label: '最後', value: fmtDate(h.lastAt) },
              ].map((t) => (
                <Card key={t.label} className="p-2.5">
                  <div className="text-xs text-slate-500">{t.label}</div>
                  <div className="mt-0.5 text-sm font-semibold tabular-nums">{t.value}</div>
                </Card>
              ))}
            </div>
            <Card className="space-y-1.5 p-4 text-sm">
              {h.triedQuestions > 0 && (
                <p>
                  問題: 答え合わせ {h.attempts} 回。いまの正解{' '}
                  <strong>
                    {h.correctNow}/{h.triedQuestions}
                  </strong>{' '}
                  問（問題ごとの最後の結果）
                </p>
              )}
              {lessonCard && (
                <p className="flex items-center gap-1.5">
                  <CalendarClock className="size-4 text-amber-600" />
                  レッスンの次の復習:{' '}
                  <span
                    className={cn(
                      isDue(lessonCard, now) && 'font-semibold text-amber-700 dark:text-amber-300',
                    )}
                  >
                    {isDue(lessonCard, now) ? '今日' : fmtDate(lessonCard.due)}
                  </span>
                </p>
              )}
              {h.nextDue !== undefined && !lessonCard && (
                <p className="flex items-center gap-1.5">
                  <CalendarClock className="size-4 text-amber-600" />
                  次の復習: {h.nextDue <= now ? '今日' : fmtDate(h.nextDue)}
                </p>
              )}
              {href && (
                <Link
                  href={href}
                  className="inline-flex items-center gap-1 font-medium text-accent-700 hover:underline dark:text-accent-300"
                >
                  {h.kind === 'lesson' ? 'レッスンを開く' : '問題を開く'}
                  <ArrowRight className="size-4" />
                </Link>
              )}
            </Card>

            <section className="space-y-2">
              <h2 className="px-1 font-semibold">学習した日（{h.log.length} 日）</h2>
              {h.log.map((d) => (
                <Card key={d.date} className="space-y-2 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold tabular-nums">{dayLabel(d.date)}</span>
                    {d.opened && !d.read && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
                        <BookOpenText className="size-3" />
                        開いた
                      </span>
                    )}
                    {d.read && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs text-accent-800 dark:bg-accent-900/40 dark:text-accent-200">
                        <BookCheck className="size-3" />
                        読んだ
                      </span>
                    )}
                    {d.reviewGrade !== undefined && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                        <CalendarClock className="size-3" />
                        復習: {gradeLabel(d.reviewGrade)}
                      </span>
                    )}
                    {d.attempts > 0 && (
                      <span className="ml-auto text-xs text-slate-500 tabular-nums">
                        答え合わせ {d.attempts} 回・正解 {d.correct}
                      </span>
                    )}
                  </div>
                  {d.questions.length > 0 && (
                    <ul className="space-y-1">
                      {d.questions.map((q) => (
                        <li key={q.questionId} className="flex items-start gap-1.5 text-xs">
                          {q.correct && !q.revealed ? (
                            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                          ) : (
                            <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                          )}
                          <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-300">
                            {texts.get(q.questionId) ?? q.questionId}
                            {q.revealed && <span className="text-slate-500">（答えを見た）</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ))}
            </section>

            {perQuestion.size > 0 && (
              <Card className="overflow-hidden">
                <h2 className="px-4 pt-3 pb-2 font-semibold">問題ごとの成績</h2>
                <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-3 py-1.5 text-left font-medium">問題</th>
                        <th className="px-2 py-1.5 text-right font-medium whitespace-nowrap">
                          正解/回
                        </th>
                        <th className="px-2 py-1.5 text-right font-medium whitespace-nowrap">
                          次の復習
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {[...perQuestion].map(([qid, s]) => {
                        const due = dueOf(qid);
                        return (
                          <tr key={qid} className="align-top">
                            <td className="px-3 py-1.5">
                              <span className="flex items-start gap-1">
                                {s.last ? (
                                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                                ) : (
                                  <XCircle className="mt-0.5 size-3.5 shrink-0 text-rose-500" />
                                )}
                                {texts.get(qid) ?? qid}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                              {s.correct}/{s.tried}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums whitespace-nowrap">
                              {due === undefined
                                ? '—'
                                : due <= now
                                  ? '今日'
                                  : fmtDate(due).slice(5)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
