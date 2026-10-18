import { useMemo, useState } from 'react';
import type { Widget } from '@/lib/content/schema';
import { formatAmount } from '@/lib/journal/amount';
import { evaluateDeficiency } from '@/lib/jsox/deficiency';
import { cn } from '@/lib/utils/cn';
import { amount, useAmounts } from './useAmounts';
import { AmountField, ResetButton } from './widgetParts';

/** 内部統制の不備の評価（金額的重要性の目安と質的な重要性） */
export function DeficiencyWidget({ w }: { w: Extract<Widget, { type: 'deficiency' }> }) {
  const { values, set, reset } = useAmounts({
    pretaxIncome: w.pretaxIncome,
    potentialMisstatement: w.potentialMisstatement,
  });
  const [qualitative, setQualitative] = useState(false);
  const r = useMemo(
    () =>
      evaluateDeficiency({
        pretaxIncome: amount(values.pretaxIncome),
        potentialMisstatement: amount(values.potentialMisstatement),
        qualitative,
      }),
    [values, qualitative],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField
          label="連結税引前利益"
          value={values.pretaxIncome}
          onChange={set('pretaxIncome')}
        />
        <AmountField
          label="潜在的な影響額"
          value={values.potentialMisstatement}
          onChange={set('potentialMisstatement')}
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={qualitative}
          onChange={(e) => setQualitative(e.target.checked)}
        />
        質的に重要な事情がある（不正・経営者の関与、上場廃止基準や財務制限条項に関わる、関連当事者との取引など）
      </label>
      {r.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{r.error}</p>
      ) : (
        <div className="space-y-2 text-sm">
          <ol className="list-decimal space-y-1 pl-5 leading-relaxed">
            {r.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p
            className={cn(
              'rounded-xl px-3 py-2 font-medium',
              r.likelyMaterial
                ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
            )}
          >
            {r.likelyMaterial
              ? '「開示すべき重要な不備」にあたる可能性が高い'
              : `金額的重要性の目安（${formatAmount(r.threshold)}）を下回り、質的な事情もない → 開示すべき重要な不備にはあたらない可能性が高い`}
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            学習用の目安です。実際は、影響が及ぶ範囲・発生の可能性・ほかの不備との組み合わせ・補う統制の有無などを含めて総合的に判断します。
          </p>
        </div>
      )}
      <ResetButton
        onClick={() => {
          reset();
          setQualitative(false);
        }}
      />
    </>
  );
}
