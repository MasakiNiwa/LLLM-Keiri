import { useMemo, useState } from 'react';
import { CheckCircle2, Eraser, Eye, Lightbulb, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useContent } from '@/features/content/contentStore';
import type { ShiwakeQuestion } from '@/lib/content/schema';
import { accountChoices } from '@/lib/journal/choices';
import { judgeJournal, type JudgeResult } from '@/lib/journal/judge';
import { parseShiwake } from '@/lib/journal/parse';
import type { JournalLine } from '@/lib/journal/types';
import { cn } from '@/lib/utils/cn';
import { draftProblems, draftToLines, emptyDraft, type DraftLine } from './draft';
import { JournalInput } from './JournalInput';
import { JournalTable } from './JournalTable';

export interface ExerciseOutcome {
  result: JudgeResult;
  /** 入力した仕訳 */
  lines: JournalLine[];
  /** 答えを見てから答え合わせしたか */
  revealed: boolean;
}

interface ShiwakeExerciseProps {
  question: ShiwakeQuestion;
  /** 選択肢の並びを決める種（問題ごとに変える） */
  seed: string;
  /** 答え合わせをしたとき（最初の 1 回だけでなく毎回） */
  onJudged?: (outcome: ExerciseOutcome) => void;
  /** 「答えを見る」を押したとき */
  onReveal?: () => void;
  /** 答え合わせの結果の下（解答の上）に出すもの（AI のひとことなど） */
  reaction?: React.ReactNode;
  /** 答え合わせのあとに、下に出すもの（次の問題へのボタンなど） */
  footer?: React.ReactNode;
}

/**
 * 仕訳の問題を解く（科目を選び、金額を入れ、プログラムが採点する）。
 * 練習ページとレッスンの確認問題で共通に使う。
 */
export function ShiwakeExercise({
  question,
  seed,
  onJudged,
  onReveal,
  reaction,
  footer,
}: ShiwakeExerciseProps) {
  const book = useContent((s) => s.book);
  const answer = useMemo(() => parseShiwake(question.answer).entries[0], [question.answer]);
  const candidates = useMemo(() => {
    if (!book || !answer) return question.accounts;
    if (question.accounts) return question.accounts.map((a) => book.canonical(a));
    return accountChoices(
      answer.lines.map((l) => l.account),
      book,
      seed,
    );
  }, [book, answer, question.accounts, seed]);

  const [draft, setDraft] = useState<DraftLine[]>(emptyDraft);
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hint, setHint] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);

  const check = () => {
    const p = draftProblems(draft);
    setProblems(p);
    if (p.length > 0 || !answer) return;
    const lines = draftToLines(draft);
    const r = judgeJournal(answer.lines, lines, (n) => book?.canonical(n) ?? n);
    setResult(r);
    onJudged?.({ result: r, lines, revealed });
  };
  const clear = () => {
    setDraft(emptyDraft());
    setResult(null);
    setProblems([]);
  };

  return (
    <div className="space-y-3">
      <JournalInput
        value={draft}
        onChange={(d) => {
          setDraft(d);
          // 入力を直したら、前の採点の印は消す
          if (result) setResult(null);
        }}
        candidates={candidates}
        marks={result?.marks}
      />
      {problems.length > 0 && (
        <ul className="text-sm text-rose-600 dark:text-rose-400">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={check}>
          <CheckCircle2 />
          答え合わせ
        </Button>
        <Button variant="ghost" onClick={clear} title="入力を消す">
          <Eraser />
          クリア
        </Button>
        {question.hint && !hint && (
          <Button variant="ghost" onClick={() => setHint(true)}>
            <Lightbulb />
            ヒント
          </Button>
        )}
        {!revealed && (
          <Button
            variant="ghost"
            onClick={() => {
              setRevealed(true);
              onReveal?.();
            }}
          >
            <Eye />
            答えを見る
          </Button>
        )}
      </div>
      {hint && question.hint && (
        <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" />
          {question.hint}
        </p>
      )}
      {result && (
        <div
          aria-live="polite"
          className={cn(
            'space-y-1.5 rounded-xl border p-3 text-sm',
            result.correct
              ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
              : 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30',
          )}
        >
          <p
            className={cn(
              'flex items-center gap-1.5 text-base font-semibold',
              result.correct
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-rose-700 dark:text-rose-300',
            )}
          >
            {result.correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            {result.correct ? '正解！' : 'おしい！'}
          </p>
          {!result.correct && (
            <ul className="list-disc space-y-0.5 pl-5">
              {result.messages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {result && reaction}
      {(revealed || result?.correct) && answer && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">正解の仕訳</h3>
          <JournalTable entry={answer} />
          {question.explanation && (
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {question.explanation}
            </p>
          )}
        </div>
      )}
      {result && footer}
    </div>
  );
}
