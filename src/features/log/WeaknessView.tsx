import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Lightbulb, RotateCcw } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'wouter';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { useAccountSheet } from '@/features/accounts/accountSheetStore';
import { useFocus } from '@/features/ai/useFocus';
import { useContentIndex } from '@/features/content/contentStore';
import { useLessonProgress } from '@/features/learn/progress';
import { fetchDrill, fetchExercise } from '@/lib/content/load';
import { db } from '@/lib/db/db';
import { parseShiwake } from '@/lib/journal/parse';
import { analyzeWeakness, MISTAKE_LABELS, type SetInfo } from '@/lib/log/weakness';

/** 間違いの種類ごとのアドバイス */
const TIPS: Record<string, string> = {
  swapped: '「増えたら左、減ったら右（資産・費用）」の向きを、5 つの要素ごとに確かめましょう。',
  account:
    '似た科目の使い分け（売掛金と未収入金、前払金と前払費用など）を、勘定科目の説明で確かめましょう。',
  amount: '税抜・税込、月割り、差額補充など、金額の計算の手順を解説で確かめましょう。',
  unbalanced: '借方の合計と貸方の合計が一致しているか、入力のあとに確かめる習慣をつけましょう。',
  choice: '解説を読んで、正しい選択肢の理由を自分の言葉で説明できるようにしましょう。',
  revealed: '答えを見て解いた問題は、時間をおいてもう一度、見ないで解いてみましょう。',
};

/** 問題セット → 分野と、問題ごとの正解の科目（分析に使う） */
function useSetInfos(): Map<string, SetInfo> | null {
  const { index } = useContentIndex();
  const mine = useLiveQuery(() => db.userContent.toArray(), []);
  const [infos, setInfos] = useState<Map<string, SetInfo> | null>(null);
  useEffect(() => {
    if (!index || !mine) return;
    let stale = false;
    const accountsOf = (answer: string) =>
      parseShiwake(answer).entries.flatMap((e) => e.lines.map((l) => l.account));
    void (async () => {
      const m = new Map<string, SetInfo>();
      const drills = await Promise.all(index.drills.map((d) => fetchDrill(d.id).catch(() => null)));
      for (const d of drills)
        if (d)
          m.set(d.id, {
            track: d.track,
            accounts: new Map(d.questions.map((q) => [q.id, accountsOf(q.answer)])),
          });
      const exercises = await Promise.all(
        index.exercises.map((e) => fetchExercise(e.id).catch(() => null)),
      );
      for (const e of exercises)
        if (e)
          m.set(`exercise:${e.id}`, {
            track: 'closing',
            accounts: new Map(e.adjustments.map((q) => [q.id, accountsOf(q.answer)])),
          });
      for (const q of index.quizzes) m.set(`quiz:${q.id}`, { track: q.track, accounts: new Map() });
      for (const l of index.lessons)
        m.set(`lesson:${l.id}`, { track: l.track, accounts: new Map() });
      for (const c of mine)
        if (c.kind === 'drill')
          m.set(c.id, {
            track: c.data.track,
            accounts: new Map(c.data.questions.map((q) => [q.id, accountsOf(q.answer)])),
          });
      if (!stale) setInfos(m);
    })();
    return () => {
      stale = true;
    };
  }, [index, mine]);
  return infos;
}

export function WeaknessView() {
  const { index } = useContentIndex();
  const attempts = useLiveQuery(() => db.drillAttempts.toArray(), []);
  const infos = useSetInfos();
  const progress = useLessonProgress();
  const openAccount = useAccountSheet((s) => s.open);
  const w = useMemo(
    () => (attempts && infos ? analyzeWeakness(attempts, infos) : null),
    [attempts, infos],
  );
  // 苦手の分析（プログラムが集計した数字）を AI に伝える
  useFocus({
    kind: 'other',
    page: w
      ? `学習の記録・苦手の分析（分野ごとの正解率: ${w.tracks
          .map(
            (t) =>
              `${index?.tracks.find((x) => x.id === t.track)?.title ?? t.track} ${t.rate}%（${t.correct}/${t.tried}）`,
          )
          .join('、')}。間違えやすい科目: ${w.accounts
          .slice(0, 5)
          .map((a) => a.account)
          .join('、')}。間違いの種類: ${Object.entries(w.kinds)
          .map(([k, n]) => `${MISTAKE_LABELS[k] ?? k} ${n}`)
          .join('、')}）`
      : '学習の記録・苦手の分析',
  });
  if (!w || !index) return <p className="text-sm text-slate-500">集計中…</p>;
  if (w.tried < 5)
    return (
      <Card className="p-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        まだ答え合わせが少ないので（{w.tried} 問）、苦手の分析ができません。
        <Link href="/drill" className="text-accent-700 underline dark:text-accent-300">
          練習
        </Link>
        で 5 問以上解くと、分野ごとの正解率や間違えやすい科目を表示します。
      </Card>
    );
  const trackTitle = (id: string) => index.tracks.find((t) => t.id === id)?.title ?? id;
  const weakest = w.tracks.find((t) => t.rate < 80);
  const unread = weakest
    ? index.lessons
        .filter((l) => l.track === weakest.track && !progress?.get(l.id)?.readAt)
        .slice(0, 3)
    : [];
  const kinds = Object.entries(w.kinds).sort((a, b) => b[1] - a[1]);
  // 今日の復習（FSRS）に入るのは仕訳の問題セットだけ
  const reviewable = w.wrongQuestions.filter((q) => !q.setId.includes(':')).length;
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">分野ごとの正解率（苦手な順）</h2>
        <ul className="space-y-2.5 text-sm">
          {w.tracks.map((t) => (
            <li key={t.track} className="space-y-1">
              <div className="flex gap-2">
                <span className="flex-1">{trackTitle(t.track)}</span>
                <span className="tabular-nums">
                  {t.rate}%（{t.correct}/{t.tried}）
                </span>
              </div>
              <Progress value={t.rate / 100} className="h-2" />
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          問題ごとに、最後の答え合わせの結果で数えています（答えを見て解いた問題は正解に数えません）。
        </p>
      </Card>

      {w.accounts.length > 0 && (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">間違えやすい勘定科目</h2>
          <div className="flex flex-wrap gap-2">
            {w.accounts.slice(0, 8).map((s) => (
              <button
                key={s.account}
                type="button"
                onClick={() => openAccount(s.account)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-sm text-rose-800 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
              >
                {s.account}
                <span className="ml-1 text-xs tabular-nums opacity-70">
                  {s.wrong}/{s.tried}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            押すと科目の説明が開きます。数字は「その科目を使う問題で、最後に間違えた数／解いた数」です。
          </p>
        </Card>
      )}

      {kinds.length > 0 && (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">間違いの種類</h2>
          <ul className="space-y-2 text-sm">
            {kinds.map(([k, n]) => (
              <li key={k}>
                <div className="flex gap-2 font-medium">
                  <span className="flex-1">{MISTAKE_LABELS[k] ?? k}</span>
                  <span className="tabular-nums">{n} 問</span>
                </div>
                {TIPS[k] && <p className="text-xs leading-relaxed text-slate-500">{TIPS[k]}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-2 p-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Lightbulb className="size-5 text-amber-500" />
          次にやること
        </h2>
        <ul className="space-y-1.5 text-sm">
          {reviewable > 0 && (
            <li>
              <Link
                href="/review"
                className="inline-flex items-center gap-1 text-accent-700 hover:underline dark:text-accent-300"
              >
                <RotateCcw className="size-4" />
                今日の復習で、間違えた仕訳問題を解き直す（{reviewable} 問）
              </Link>
            </li>
          )}
          {weakest && (
            <li>
              「{trackTitle(weakest.track)}」の正解率が {weakest.rate}% です。
              {unread.length > 0
                ? 'まだ読んでいないレッスン:'
                : 'レッスンを読み直してから、もう一度解いてみましょう。'}
              <ul className="mt-1 space-y-0.5">
                {unread.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/learn/${l.id}`}
                      className="inline-flex items-center gap-0.5 text-accent-700 hover:underline dark:text-accent-300"
                    >
                      {l.title}
                      <ChevronRight className="size-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          )}
          {!weakest && (
            <li>どの分野も正解率 80% 以上です。レベルの高い問題や演習に進みましょう。</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
