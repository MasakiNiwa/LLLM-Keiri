import { useEffect, useState } from 'react';
import { ArrowRight, CalendarCheck, CheckCircle2, XCircle } from 'lucide-react';
import { Rating, type Grade } from 'ts-fsrs';
import { Link } from 'wouter';
import { BackButton } from '@/app/BackButton';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { ReactionBubble } from '@/features/ai/ReactionBubble';
import type { ReactionKey } from '@/features/ai/personas';
import { useFocus } from '@/features/ai/useFocus';
import { recordAttempt } from '@/features/drill/records';
import { ReviewOverview } from '@/features/drill/ReviewOverview';
import { loadReviewItems, type ReviewItem } from '@/features/drill/reviewItems';
import { setReviewGrade, updateReview, useReviewRecords } from '@/features/drill/reviewRepo';
import { ShiwakeExercise, type ExerciseOutcome } from '@/features/journal/ShiwakeExercise';
import { ChoiceQuiz } from '@/features/learn/QuizBlock';
import { RiskCard } from '@/features/learn/RcmExercise';
import { useFontZoom } from '@/features/settings/useFontZoom';
import { useSettings } from '@/features/settings/settingsStore';
import { db } from '@/lib/db/db';
import { formatShiwake } from '@/lib/journal/parse';
import { isDue, SELF_GRADES, type ReviewFields } from '@/lib/srs/review';
import { cn } from '@/lib/utils/cn';

interface Queue {
  items: ReviewItem[];
  /** 上限を超えて、明日以降にまわした数 */
  rest: number;
  next?: number;
}

/** 今日の復習の問題（開いたときの分で固定する。解いているあいだに予定が変わっても並びは変えない） */
async function loadQueue(limit: number): Promise<Queue> {
  const now = Date.now();
  const all = await db.reviews.orderBy('due').toArray();
  const due = all.filter((r) => isDue(r, now));
  const items = await loadReviewItems(due);
  const shown = limit > 0 ? items.slice(0, limit) : items;
  return {
    items: shown,
    rest: items.length - shown.length,
    next: all.find((r) => !isDue(r, now))?.due,
  };
}

const questionText = (it: ReviewItem) =>
  it.kind === 'shiwake' ? it.question.question : it.kind === 'choice' ? it.question : it.risk.risk;

interface Judged {
  correct: boolean;
  /** 自己評価の付け直しのための、更新前の状態（null は初めての問題） */
  prev?: ReviewFields | null;
  grade: Grade;
}

/** 正解したあとの自己評価（むずかしかった・ふつう・かんたん） */
function SelfGrade({ judged, onChange }: { judged: Judged; onChange: (g: Grade) => void }) {
  if (!judged.correct) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-slate-600 dark:text-slate-400">思い出すのは</span>
      {SELF_GRADES.map((g) => (
        <button
          key={g.grade}
          type="button"
          aria-pressed={judged.grade === g.grade}
          disabled={judged.prev === undefined}
          onClick={() => onChange(g.grade)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-50',
            judged.grade === g.grade
              ? 'border-accent-600 bg-accent-600 text-white'
              : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900',
          )}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const limit = useSettings((s) => s.reviewLimit);
  const records = useReviewRecords();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [pos, setPos] = useState(0);
  const [judged, setJudged] = useState<Record<number, Judged>>({});
  const [last, setLast] = useState<ExerciseOutcome | null>(null);
  const [reaction, setReaction] = useState<{ n: number; key: ReactionKey }>({
    n: 0,
    key: 'correct',
  });
  const zoom = useFontZoom();

  useEffect(() => {
    let stale = false;
    void loadQueue(useSettings.getState().reviewLimit).then((q) => !stale && setQueue(q));
    return () => {
      stale = true;
    };
  }, []);

  const item = queue?.items[pos];
  const finished = !!queue && pos >= queue.items.length;
  const judgedHere = last && item ? last : null;

  useFocus(
    item && item.kind === 'shiwake'
      ? {
          kind: 'drill',
          setId: item.setId,
          setTitle: `今日の復習（${item.title}）`,
          questionId: item.questionId,
          question: item.question.question,
          position: `${pos + 1}/${queue?.items.length} 問目`,
          revealed: !!judgedHere?.result.correct || !!judgedHere?.revealed,
          answer: judgedHere?.result.correct ? item.question.answer : undefined,
          userAnswer: judgedHere ? formatShiwake({ lines: judgedHere.lines }) : undefined,
          judge: judgedHere
            ? {
                kind: judgedHere.result.kind,
                correct: judgedHere.result.correct,
                messages: judgedHere.result.messages,
              }
            : undefined,
        }
      : {
          kind: 'other',
          page: item ? `今日の復習（${item.title}）「${questionText(item)}」` : '今日の復習',
        },
  );

  /** 答え合わせ: 最初の結果で次の復習日を決め、学習の記録にも残す */
  const judge = (correct: boolean, revealed: boolean, kind: string) => {
    if (!item) return;
    const i = pos;
    if (judged[i] === undefined) {
      const ok = correct && !revealed;
      setJudged((j) => ({ ...j, [i]: { correct: ok, grade: ok ? Rating.Good : Rating.Again } }));
      void updateReview(item.setId, item.questionId, correct, revealed).then((prev) =>
        setJudged((j) => ({ ...j, [i]: { ...j[i], prev: prev ?? null } })),
      );
    }
    void recordAttempt({ setId: item.setId, questionId: item.questionId, correct, revealed, kind });
  };

  const regrade = (g: Grade) => {
    const j = judged[pos];
    if (!item || !j || j.prev === undefined || j.grade === g) return;
    setJudged((x) => ({ ...x, [pos]: { ...j, grade: g } }));
    void setReviewGrade(item.setId, item.questionId, g, j.prev);
  };

  const onJudged = (o: ExerciseOutcome) => {
    setLast(o);
    setReaction({ n: reaction.n + 1, key: o.result.kind });
    judge(o.result.correct, o.revealed, o.result.kind);
  };

  const next = () => {
    setPos(pos + 1);
    setLast(null);
    document.querySelector('[data-scroll-root]')?.scrollTo(0, 0);
  };

  const correctCount = Object.values(judged).filter((j) => j.correct).length;
  const nextButton = (
    <div className="flex justify-end">
      <Button variant={judged[pos]?.correct ? 'primary' : 'secondary'} onClick={next}>
        {pos + 1 < (queue?.items.length ?? 0) ? '次の問題' : '結果を見る'}
        <ArrowRight />
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="今日の復習"
        back={<BackButton to="/drill" label="練習へ" />}
        meta={
          queue &&
          !finished && (
            <span className="text-sm text-slate-500 tabular-nums">
              {pos + 1}/{queue.items.length}
            </span>
          )
        }
      />
      <PageBody>
        {!queue && <p className="text-sm text-slate-500">読み込み中…</p>}
        {queue && queue.items.length === 0 && (
          <Card className="space-y-3 p-6 text-center">
            <CalendarCheck className="mx-auto size-10 text-accent-600" />
            <p className="font-semibold">今日の復習はありません</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {queue.next
                ? `次の復習は ${new Date(queue.next).toLocaleDateString('ja-JP')} です。`
                : '仕訳問題・選択問題・総合演習・レッスンの確認問題を解くと、間違えた問題や忘れかけた問題を、ちょうどよい日にここで出し直します。'}
            </p>
            <Link
              href="/drill"
              className="text-sm text-accent-700 hover:underline dark:text-accent-300"
            >
              練習の問題へ
            </Link>
          </Card>
        )}
        {queue && queue.items.length > 0 && (
          <Progress
            value={Math.min(pos, queue.items.length) / queue.items.length}
            className="h-1.5"
          />
        )}
        {finished && queue.items.length > 0 && (
          <Card className="space-y-3 p-5 text-center">
            <p className="text-sm text-slate-500">今日の復習はおしまいです</p>
            <p className="text-3xl font-bold tabular-nums">
              {correctCount}
              <span className="text-lg text-slate-500"> / {queue.items.length} 問 正解</span>
            </p>
            <ul className="space-y-1 text-left text-sm">
              {queue.items.map((it, i) => (
                <li key={i} className="flex items-start gap-2">
                  {judged[i]?.correct ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                  )}
                  <span className="min-w-0 flex-1">{questionText(it)}</span>
                </li>
              ))}
            </ul>
            {queue.rest > 0 && (
              <p className="text-xs text-slate-500">
                1 日の上限（{limit} 問）を超えた {queue.rest} 問は、明日以降に出します。
              </p>
            )}
            <p className="text-xs text-slate-500">
              間違えた問題は近いうちに、正解した問題は間隔をあけて、また出します（記憶のアルゴリズム
              FSRS）。
            </p>
          </Card>
        )}
        {item && !finished && (
          <div style={{ zoom }} className="space-y-4">
            <Card className="space-y-2 p-4">
              <Link
                href={item.href}
                className="text-xs font-semibold text-accent-700 hover:underline dark:text-accent-300"
              >
                {item.title}
              </Link>
              {item.kind === 'choice' && item.context && (
                <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed whitespace-pre-line dark:bg-slate-800/50">
                  {item.context}
                </p>
              )}
              {item.kind !== 'rcm' && (
                <p className="text-[1.05rem] leading-relaxed font-medium">{questionText(item)}</p>
              )}
              {item.kind === 'choice' && (
                <ChoiceQuiz
                  key={pos}
                  quiz={item}
                  onAnswer={(ok) => judge(ok, false, ok ? 'exact' : 'choice')}
                />
              )}
              {item.kind === 'rcm' && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium">
                    業務記述書（{item.rcm.process}）
                  </summary>
                  <ol className="mt-2 space-y-1.5 leading-relaxed">
                    {item.rcm.steps.map((s, i) => (
                      <li key={s.id} className="flex gap-2">
                        <span className="shrink-0 font-semibold">手順 {i + 1}</span>
                        <span>{s.text}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </Card>
            {item.kind === 'rcm' && (
              <RiskCard
                key={pos}
                rcm={item.rcm}
                risk={item.risk}
                index={item.index}
                onGraded={(ok) => judge(ok, false, ok ? 'exact' : 'choice')}
              />
            )}
            {item.kind === 'shiwake' && (
              <ShiwakeExercise
                key={pos}
                question={item.question}
                seed={`${item.setId}:${item.questionId}`}
                onJudged={onJudged}
                reaction={
                  <ReactionBubble
                    trigger={reaction.n}
                    reactionKey={reaction.key}
                    focus={undefined}
                  />
                }
              />
            )}
            {judged[pos] && <SelfGrade judged={judged[pos]} onChange={regrade} />}
            {judged[pos] && nextButton}
          </div>
        )}
        {records && records.length > 0 && <ReviewOverview records={records} />}
      </PageBody>
    </>
  );
}
