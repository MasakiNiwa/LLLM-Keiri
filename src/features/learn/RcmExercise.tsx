import { useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RCM_ASSERTIONS, RCM_METHODS, RCM_TYPES, type RcmCase } from '@/lib/content/schema';
import {
  gradeRisk,
  RCM_FIELD_LABELS,
  RCM_FIELDS,
  type RcmAnswer,
  type RcmField,
  type RcmGrade,
} from '@/lib/jsox/rcm';
import { cn } from '@/lib/utils/cn';

type Risk = RcmCase['risks'][number];

const stepLabel = (rcm: RcmCase, id: string) => {
  const i = rcm.steps.findIndex((s) => s.id === id);
  return i < 0 ? id : `手順 ${i + 1}`;
};

function RiskCard({
  rcm,
  risk,
  index,
  onGraded,
}: {
  rcm: RcmCase;
  risk: Risk;
  index: number;
  onGraded: (correct: boolean) => void;
}) {
  const [answer, setAnswer] = useState<Partial<RcmAnswer>>({});
  const [grade, setGrade] = useState<RcmGrade | null>(null);
  const options: Record<RcmField, { value: string; label: string }[]> = {
    control: rcm.steps.map((s, i) => ({ value: s.id, label: `手順 ${i + 1}` })),
    assertion: RCM_ASSERTIONS.map((v) => ({ value: v, label: v })),
    type: RCM_TYPES.map((v) => ({ value: v, label: v })),
    method: RCM_METHODS.map((v) => ({ value: v, label: v })),
  };
  const correctLabel = (f: RcmField) => (f === 'control' ? stepLabel(rcm, risk.control) : risk[f]);
  const pending = gradeRisk(risk, answer).incomplete;
  return (
    <Card className="space-y-3 p-4">
      <p className="leading-relaxed font-medium">
        <span className="mr-1 font-semibold text-accent-700 dark:text-accent-300">
          リスク {index + 1}.
        </span>
        {risk.risk}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {RCM_FIELDS.map((f) => (
          <label key={f} className="block text-xs text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              {RCM_FIELD_LABELS[f]}
              {grade &&
                (grade.fields[f] ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600" aria-label="正解" />
                ) : (
                  <XCircle className="size-3.5 text-rose-500" aria-label="不正解" />
                ))}
            </span>
            <select
              value={answer[f] ?? ''}
              disabled={grade !== null}
              onChange={(e) => setAnswer((a) => ({ ...a, [f]: e.target.value }))}
              className={cn(
                'mt-1 h-10 w-full rounded-xl border bg-white px-2 text-sm text-slate-900 dark:bg-slate-900 dark:text-slate-100',
                grade && !grade.fields[f]
                  ? 'border-rose-400 dark:border-rose-700'
                  : 'border-slate-300 dark:border-slate-700',
              )}
            >
              <option value="">選ぶ</option>
              {options[f].map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {grade ? (
        <div className="space-y-2 text-sm" aria-live="polite">
          <p
            className={cn(
              'flex items-center gap-1.5 font-semibold',
              grade.correct
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-rose-700 dark:text-rose-300',
            )}
          >
            {grade.correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            {grade.correct ? '正解！' : '惜しい'}
          </p>
          {!grade.correct && (
            <p className="text-slate-600 dark:text-slate-400">
              答え:{' '}
              {RCM_FIELDS.map((f) => `${RCM_FIELD_LABELS[f]}「${correctLabel(f)}」`).join('、')}
            </p>
          )}
          <p className="leading-relaxed">{risk.explanation}</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setGrade(null);
              setAnswer({});
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
          disabled={pending}
          onClick={() => {
            const g = gradeRisk(risk, answer);
            setGrade(g);
            onGraded(g.correct);
          }}
        >
          答え合わせ
        </Button>
      )}
    </Card>
  );
}

/** RCM の演習: 業務記述書を読み、リスクごとにコントロールと性質を選ぶ（採点はプログラム） */
export function RcmExercise({
  rcm,
  onGraded,
}: {
  rcm: RcmCase;
  onGraded: (riskId: string, correct: boolean) => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const done = checked.size === rcm.risks.length;
  return (
    <section className="space-y-3">
      <Card className="p-4">
        <h2 className="mb-2 font-semibold">業務記述書（{rcm.process}）</h2>
        <ol className="space-y-2 text-sm leading-relaxed">
          {rcm.steps.map((s, i) => (
            <li key={s.id} className="flex gap-2">
              <span className="shrink-0 font-semibold text-accent-700 dark:text-accent-300">
                手順 {i + 1}
              </span>
              <span className="min-w-0 flex-1">{s.text}</span>
            </li>
          ))}
        </ol>
      </Card>
      <p className="px-1 text-sm text-slate-600 dark:text-slate-400">
        リスクごとに、それを防ぐ・見つけるコントロールがある手順と、アサーション・予防か発見か・手作業か自動かを選びます。リスクに対応しない手順もあります。
      </p>
      {rcm.risks.map((r, i) => (
        <RiskCard
          key={r.id}
          rcm={rcm}
          risk={r}
          index={i}
          onGraded={(ok) => {
            setChecked((s) => new Set(s).add(r.id));
            onGraded(r.id, ok);
          }}
        />
      ))}
      {done && (
        <Card className="overflow-hidden">
          <h2 className="px-4 pt-3 pb-2 font-semibold">できあがった RCM</h2>
          <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[40rem] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  {['リスク', 'コントロール', 'アサーション', '予防・発見', '手作業・自動'].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top dark:divide-slate-800">
                {rcm.risks.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">{r.risk}</td>
                    <td className="px-3 py-2">
                      {stepLabel(rcm, r.control)}: {rcm.steps.find((s) => s.id === r.control)?.text}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.assertion}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.type}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </section>
  );
}
