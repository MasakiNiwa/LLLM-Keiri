import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'wouter';
import { BackButton } from '@/app/BackButton';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { useFocus } from '@/features/ai/useFocus';
import { recordAttempt } from '@/features/drill/records';
import { useReviewOnce } from '@/features/drill/reviewRepo';
import { BasisInfo } from '@/features/learn/MetaBadges';
import { ChoiceQuiz } from '@/features/learn/QuizBlock';
import { MatchExercise } from '@/features/learn/MatchExercise';
import { RcmExercise } from '@/features/learn/RcmExercise';
import { fetchQuizSet } from '@/lib/content/load';
import type { QuizSet } from '@/lib/content/schema';
import { db } from '@/lib/db/db';
import { errorMessage } from '@/lib/utils/format';

export default function QuizSetPage() {
  const { id = '' } = useParams<{ id: string }>();
  return <QuizSetBody key={id} id={id} />;
}

/** 選択問題のセット。答え合わせはプログラムが行い、記録はこの端末に残る */
function QuizSetBody({ id }: { id: string }) {
  const [set, setSet] = useState<QuizSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setId = `quiz:${id}`;
  const review = useReviewOnce(setId);
  const record = (questionId: string, ok: boolean) => {
    review(questionId, ok, false);
    void recordAttempt({
      setId,
      questionId,
      correct: ok,
      revealed: false,
      kind: ok ? 'exact' : 'choice',
    });
  };
  useEffect(() => {
    let stale = false;
    fetchQuizSet(id).then(
      (s) => !stale && setSet(s),
      (e) => !stale && setError(errorMessage(e)),
    );
    return () => {
      stale = true;
    };
  }, [id]);
  const attempts = useLiveQuery(
    () => db.drillAttempts.where('setId').equals(setId).toArray(),
    [setId],
  );
  // 最後の答えが正解かどうか
  const last = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const a of [...(attempts ?? [])].sort((x, y) => x.at - y.at))
      m.set(a.questionId, a.correct);
    return m;
  }, [attempts]);
  const ids = set
    ? [...(set.rcm?.risks ?? []), ...(set.match?.items ?? []), ...set.questions].map((q) => q.id)
    : [];
  const correct = ids.filter((qid) => last.get(qid)).length;
  useFocus(
    set
      ? {
          kind: 'other',
          page: `選択問題「${set.title}」（正解 ${correct}/${ids.length}）`,
        }
      : { kind: 'other', page: '選択問題' },
  );

  return (
    <>
      <PageHeader
        title={set?.title ?? '選択問題'}
        back={<BackButton to="/drill" label="練習へ" />}
      />
      <PageBody>
        {error && <p className="text-sm text-rose-600">読み込めませんでした: {error}</p>}
        {!set && !error && <p className="text-sm text-slate-500">読み込み中…</p>}
        {set && (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-400">{set.summary}</p>
            <div className="flex items-center gap-3 text-sm">
              <Progress value={correct / ids.length} className="h-2 flex-1" />
              <span className="tabular-nums">
                正解 {correct}/{ids.length}
              </span>
            </div>
            {set.rcm && <RcmExercise rcm={set.rcm} onGraded={(riskId, ok) => record(riskId, ok)} />}
            {set.match && (
              <MatchExercise match={set.match} onGraded={(itemId, ok) => record(itemId, ok)} />
            )}
            {(set.rcm || set.match) && <h2 className="px-1 pt-2 font-semibold">確認問題</h2>}
            {set.questions.map((q, i) => (
              <Card key={q.id} className="space-y-3 p-4">
                {q.context && (
                  <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed whitespace-pre-line dark:bg-slate-800/50">
                    {q.context}
                  </p>
                )}
                <div className="flex items-start gap-2">
                  <span className="font-semibold text-accent-700 dark:text-accent-300">
                    {i + 1}.
                  </span>
                  <p className="min-w-0 flex-1 leading-relaxed font-medium">{q.question}</p>
                  {last.get(q.id) === true && (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                  )}
                  {last.get(q.id) === false && (
                    <XCircle className="size-5 shrink-0 text-rose-500" />
                  )}
                </div>
                <ChoiceQuiz quiz={q} onAnswer={(ok) => record(q.id, ok)} />
              </Card>
            ))}
            <BasisInfo basis={set.basis} asOf={set.asOf} updated={set.updated} />
          </>
        )}
      </PageBody>
    </>
  );
}
