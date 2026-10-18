import { useEffect, useState } from 'react';
import { ArrowRight, CalendarCheck, CheckCircle2, XCircle } from 'lucide-react';
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
import { updateReview } from '@/features/drill/reviewRepo';
import { ShiwakeExercise, type ExerciseOutcome } from '@/features/journal/ShiwakeExercise';
import { useFontZoom } from '@/features/settings/useFontZoom';
import { loadDrill } from '@/features/studio/userContentRepo';
import type { DrillQuestion, DrillSet } from '@/lib/content/schema';
import { db } from '@/lib/db/db';
import { formatShiwake } from '@/lib/journal/parse';
import { isDue } from '@/lib/srs/review';
import { cn } from '@/lib/utils/cn';

interface Item {
  set: DrillSet;
  question: DrillQuestion;
}

/** 今日の復習の問題（開いたときの分で固定する。解いているあいだに予定が変わっても並びは変えない） */
async function loadQueue(): Promise<{ items: Item[]; next?: number }> {
  const now = Date.now();
  const all = await db.reviews.orderBy('due').toArray();
  const due = all.filter((r) => isDue(r, now));
  const sets = new Map<string, DrillSet | null>();
  const items: Item[] = [];
  for (const r of due) {
    if (!sets.has(r.setId)) sets.set(r.setId, await loadDrill(r.setId).catch(() => null));
    const set = sets.get(r.setId);
    const question = set?.questions.find((q) => q.id === r.questionId);
    if (set && question) items.push({ set, question });
  }
  return { items, next: all.find((r) => !isDue(r, now))?.due };
}

export default function ReviewPage() {
  const [queue, setQueue] = useState<{ items: Item[]; next?: number } | null>(null);
  const [pos, setPos] = useState(0);
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [last, setLast] = useState<ExerciseOutcome | null>(null);
  const [reaction, setReaction] = useState<{ n: number; key: ReactionKey }>({
    n: 0,
    key: 'correct',
  });
  const zoom = useFontZoom();

  useEffect(() => {
    let stale = false;
    void loadQueue().then((q) => !stale && setQueue(q));
    return () => {
      stale = true;
    };
  }, []);

  const item = queue?.items[pos];
  const finished = !!queue && pos >= queue.items.length;
  const judgedHere = last && item ? last : null;

  useFocus(
    item
      ? {
          kind: 'drill',
          setId: item.set.id,
          setTitle: `今日の復習（${item.set.title}）`,
          questionId: item.question.id,
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
      : { kind: 'other', page: '今日の復習' },
  );

  const onJudged = (o: ExerciseOutcome) => {
    if (!item) return;
    setLast(o);
    setReaction({ n: reaction.n + 1, key: o.result.kind });
    if (results[pos] === undefined) {
      setResults({ ...results, [pos]: o.result.correct && !o.revealed });
      void updateReview(item.set.id, item.question.id, o.result.correct, o.revealed);
    }
    void recordAttempt({
      setId: item.set.id,
      questionId: item.question.id,
      correct: o.result.correct,
      revealed: o.revealed,
      kind: o.result.kind,
    });
  };

  const next = () => {
    setPos(pos + 1);
    setLast(null);
    document.querySelector('[data-scroll-root]')?.scrollTo(0, 0);
  };

  const correctCount = Object.values(results).filter(Boolean).length;

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
                : '「練習」で問題を解くと、間違えた問題や忘れかけた問題を、ちょうどよい日にここで出し直します。'}
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
                  {results[i] ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                  )}
                  <span className="min-w-0 flex-1">{it.question.question}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              間違えた問題は近いうちに、正解した問題は間隔をあけて、また出します（記憶のアルゴリズム
              FSRS）。
            </p>
          </Card>
        )}
        {item && !finished && (
          <div style={{ zoom }} className="space-y-4">
            <Card className="p-4">
              <p className="mb-1 text-xs font-semibold text-accent-700 dark:text-accent-300">
                {item.set.title}
              </p>
              <p className="text-[1.05rem] leading-relaxed font-medium">{item.question.question}</p>
            </Card>
            <ShiwakeExercise
              key={pos}
              question={item.question}
              seed={`${item.set.id}:${item.question.id}`}
              onJudged={onJudged}
              reaction={
                <ReactionBubble trigger={reaction.n} reactionKey={reaction.key} focus={undefined} />
              }
              footer={
                <div className="flex justify-end">
                  <Button variant={last?.result.correct ? 'primary' : 'secondary'} onClick={next}>
                    {pos + 1 < (queue?.items.length ?? 0) ? '次の問題' : '結果を見る'}
                    <ArrowRight />
                  </Button>
                </div>
              }
            />
          </div>
        )}
        <p className={cn('text-xs text-slate-500', !queue && 'hidden')}>
          復習の日は、問題を解いた結果から記憶のアルゴリズム（FSRS）が決めます。
        </p>
      </PageBody>
    </>
  );
}
