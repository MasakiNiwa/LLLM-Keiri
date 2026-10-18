import { useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { MatchExercise as Match } from '@/lib/content/schema';
import { cn } from '@/lib/utils/cn';

function MatchItem({
  match,
  item,
  index,
  onGraded,
}: {
  match: Match;
  item: Match['items'][number];
  index: number;
  onGraded: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState('');
  const [graded, setGraded] = useState(false);
  const correct = picked === item.answer;
  const answerText = match.options.find((o) => o.id === item.answer)?.text;
  return (
    <Card className="space-y-3 p-4">
      <p className="leading-relaxed font-medium">
        <span className="mr-1 font-semibold text-accent-700 dark:text-accent-300">
          {index + 1}.
        </span>
        {item.prompt}
      </p>
      <label className="block text-xs text-slate-600 dark:text-slate-400">
        {match.optionsLabel}
        <select
          value={picked}
          disabled={graded}
          onChange={(e) => setPicked(e.target.value)}
          className={cn(
            'mt-1 min-h-10 w-full rounded-xl border bg-white px-2 py-2 text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100',
            graded && !correct
              ? 'border-rose-400 dark:border-rose-700'
              : 'border-slate-300 dark:border-slate-700',
          )}
        >
          <option value="">選ぶ</option>
          {match.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.text}
            </option>
          ))}
        </select>
      </label>
      {graded ? (
        <div className="space-y-2 text-sm" aria-live="polite">
          <p
            className={cn(
              'flex items-center gap-1.5 font-semibold',
              correct
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-rose-700 dark:text-rose-300',
            )}
          >
            {correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            {correct ? '正解！' : `不正解（答え: ${answerText}）`}
          </p>
          <p className="leading-relaxed">{item.explanation}</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setGraded(false);
              setPicked('');
            }}
          >
            <RotateCcw />
            もう一度
          </Button>
        </div>
      ) : (
        <Button
          size="sm"
          variant="primary"
          disabled={!picked}
          onClick={() => {
            setGraded(true);
            onGraded(picked === item.answer);
          }}
        >
          答え合わせ
        </Button>
      )}
    </Card>
  );
}

/** 組み合わせの演習（項目ごとに共通の選択肢から選ぶ。採点はプログラム） */
export function MatchExercise({
  match,
  onGraded,
}: {
  match: Match;
  onGraded: (itemId: string, correct: boolean) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 font-semibold">{match.title}</h2>
      {match.intro && (
        <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed whitespace-pre-line dark:bg-slate-800/50">
          {match.intro}
        </p>
      )}
      {match.items.map((item, i) => (
        <MatchItem
          key={item.id}
          match={match}
          item={item}
          index={i}
          onGraded={(ok) => onGraded(item.id, ok)}
        />
      ))}
    </section>
  );
}
