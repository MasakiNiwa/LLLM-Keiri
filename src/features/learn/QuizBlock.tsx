import { useMemo, useState } from 'react';
import { CheckCircle2, CircleHelp, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { QuizSchema, type Quiz } from '@/lib/content/schema';
import { cn } from '@/lib/utils/cn';
import { ShiwakeExercise } from '@/features/journal/ShiwakeExercise';

function parseQuiz(json: string): Quiz | null {
  try {
    const r = QuizSchema.safeParse(JSON.parse(json));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

function ChoiceQuiz({ quiz }: { quiz: Extract<Quiz, { type: 'choice' }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === quiz.answer;
  return (
    <>
      <div className="grid gap-2">
        {quiz.choices.map((c, i) => {
          const isAnswer = i === quiz.answer;
          const isPicked = i === picked;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setPicked(i)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-default',
                !answered &&
                  'border-slate-300 bg-white hover:border-accent-400 hover:bg-accent-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800',
                answered &&
                  isAnswer &&
                  'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100',
                answered &&
                  isPicked &&
                  !isAnswer &&
                  'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100',
                answered &&
                  !isAnswer &&
                  !isPicked &&
                  'border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500',
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold dark:bg-slate-800">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1">{c}</span>
              {answered && isAnswer && (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              )}
              {answered && isPicked && !isAnswer && (
                <XCircle className="size-5 shrink-0 text-rose-600" />
              )}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-3 space-y-2" aria-live="polite">
          <p
            className={cn(
              'flex items-center gap-1.5 font-semibold',
              correct
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-rose-700 dark:text-rose-300',
            )}
          >
            {correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            {correct ? '正解！' : '不正解'}
          </p>
          {quiz.explanation && <p className="leading-relaxed">{quiz.explanation}</p>}
          <Button size="sm" variant="ghost" onClick={() => setPicked(null)}>
            <RotateCcw />
            もう一度
          </Button>
        </div>
      )}
    </>
  );
}

/** レッスンの中の確認問題（` ```quiz `）。採点はプログラムが行う */
export function QuizBlock({ json }: { json: string }) {
  const quiz = useMemo(() => parseQuiz(json), [json]);
  if (!quiz) return null;
  return (
    <section className="my-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-accent-700 dark:text-accent-300">
        <CircleHelp className="size-4" />
        確認問題
      </div>
      <p className="mb-3 font-medium leading-relaxed">{quiz.question}</p>
      {quiz.type === 'choice' ? (
        <ChoiceQuiz quiz={quiz} />
      ) : (
        <ShiwakeExercise question={quiz} seed={quiz.question} />
      )}
    </section>
  );
}
