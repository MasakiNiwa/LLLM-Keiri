import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { BackButton } from '@/app/BackButton';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { recordAttempt } from '@/features/drill/records';
import { ShiwakeExercise, type ExerciseOutcome } from '@/features/journal/ShiwakeExercise';
import { BasisInfo } from '@/features/learn/MetaBadges';
import { useFontZoom } from '@/features/settings/useFontZoom';
import { fetchDrill } from '@/lib/content/load';
import type { DrillSet } from '@/lib/content/schema';
import { cn } from '@/lib/utils/cn';
import { errorMessage } from '@/lib/utils/format';

interface Answered {
  /** 最初の答え合わせで正解した（答えを見ずに） */
  first: boolean;
  /** いま正解している */
  correct: boolean;
}

function Summary({
  set,
  order,
  answered,
  onRetry,
  onRestart,
}: {
  set: DrillSet;
  order: string[];
  answered: Map<string, Answered>;
  onRetry: () => void;
  onRestart: () => void;
}) {
  const firstCorrect = order.filter((id) => answered.get(id)?.first).length;
  const wrong = order.filter((id) => !answered.get(id)?.first);
  return (
    <Card className="space-y-4 p-5">
      <div className="text-center">
        <p className="text-sm text-slate-500">おつかれさまでした</p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {firstCorrect}
          <span className="text-lg text-slate-500"> / {order.length} 問 正解</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          （最初の答え合わせで、答えを見ずに正解した数）
        </p>
      </div>
      <ol className="divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-700">
        {order.map((id, i) => {
          const q = set.questions.find((x) => x.id === id)!;
          const ok = answered.get(id)?.first;
          return (
            <li key={id} className="flex items-start gap-2 px-3 py-2">
              {ok ? (
                <CheckCircle2
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-label="正解"
                />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" aria-label="不正解" />
              )}
              <span className="text-slate-500 tabular-nums">{i + 1}.</span>
              <span className="min-w-0 flex-1">{q.question}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap justify-center gap-2">
        {wrong.length > 0 && (
          <Button variant="primary" onClick={onRetry}>
            <RotateCcw />
            間違えた {wrong.length} 問をもう一度
          </Button>
        )}
        <Button onClick={onRestart}>
          <RotateCcw />
          最初から
        </Button>
        <Link
          href="/drill"
          className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-medium text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          問題の一覧へ
        </Link>
      </div>
    </Card>
  );
}

export default function DrillPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [loaded, setLoaded] = useState<{ id: string; set?: DrillSet; error?: string }>({ id: '' });
  const [order, setOrder] = useState<string[] | null>(null);
  const [pos, setPos] = useState(0);
  const [answered, setAnswered] = useState<Map<string, Answered>>(new Map());
  const zoom = useFontZoom();

  useEffect(() => {
    let stale = false;
    fetchDrill(id).then(
      (set) => {
        if (stale) return;
        setLoaded({ id, set });
        setOrder(set.questions.map((q) => q.id));
        setPos(0);
        setAnswered(new Map());
      },
      (e) => !stale && setLoaded({ id, error: errorMessage(e) }),
    );
    return () => {
      stale = true;
    };
  }, [id]);

  const set = loaded.id === id ? loaded.set : undefined;
  const error = loaded.id === id ? loaded.error : undefined;
  const qid = order?.[pos];
  const question = useMemo(() => set?.questions.find((q) => q.id === qid), [set, qid]);
  const finished = !!order && pos >= order.length;

  const onJudged = ({ result, revealed }: ExerciseOutcome) => {
    if (!set || !qid) return;
    const prev = answered.get(qid);
    setAnswered(
      new Map(answered).set(qid, {
        first: prev ? prev.first : result.correct && !revealed,
        correct: result.correct,
      }),
    );
    void recordAttempt({
      setId: set.id,
      questionId: qid,
      correct: result.correct,
      revealed,
      kind: result.kind,
    });
  };

  const start = (ids: string[]) => {
    setOrder(ids);
    setPos(0);
    setAnswered(new Map());
    document.querySelector('[data-scroll-root]')?.scrollTo(0, 0);
  };

  const next = () => {
    setPos(pos + 1);
    document.querySelector('[data-scroll-root]')?.scrollTo(0, 0);
  };

  return (
    <>
      <PageHeader
        title={set?.title ?? '練習'}
        back={<BackButton to="/drill" label="問題の一覧へ" />}
        meta={
          order &&
          !finished && (
            <span className="text-sm text-slate-500 tabular-nums">
              {pos + 1}/{order.length}
            </span>
          )
        }
      />
      <PageBody key={id}>
        {error && <p className="text-sm text-rose-600">読み込めませんでした: {error}</p>}
        {!set && !error && <p className="text-sm text-slate-500">読み込み中…</p>}
        {set && order && (
          <>
            <Progress value={Math.min(pos, order.length) / order.length} className="h-1.5" />
            {finished ? (
              <Summary
                set={set}
                order={order}
                answered={answered}
                onRetry={() => start(order.filter((q) => !answered.get(q)?.first))}
                onRestart={() => start(set.questions.map((q) => q.id))}
              />
            ) : (
              question && (
                <div style={{ zoom }} className="space-y-4">
                  <Card className="p-4">
                    <p className="mb-1 text-xs font-semibold text-accent-700 dark:text-accent-300">
                      問題 {pos + 1}
                    </p>
                    <p className="text-[1.05rem] leading-relaxed font-medium">
                      {question.question}
                    </p>
                  </Card>
                  <ShiwakeExercise
                    key={`${order.join()}:${pos}`}
                    question={question}
                    seed={`${set.id}:${question.id}`}
                    onJudged={onJudged}
                    footer={
                      <div className="flex justify-end">
                        <Button
                          variant={answered.get(question.id)?.correct ? 'primary' : 'secondary'}
                          onClick={next}
                        >
                          {pos + 1 < order.length ? '次の問題' : '結果を見る'}
                          <ArrowRight />
                        </Button>
                      </div>
                    }
                  />
                </div>
              )
            )}
            <div className={cn('pt-2', !finished && 'opacity-80')}>
              <BasisInfo basis={set.basis} asOf={set.asOf} updated={set.updated} />
            </div>
          </>
        )}
      </PageBody>
    </>
  );
}
