import { useMemo, useState } from 'react';
import { Select } from '@/components/ui/Select';
import type { Widget } from '@/lib/content/schema';
import { cvp, materialVariance, overheadVariance, processCosting } from '@/lib/cost/cost';
import { formatAmount } from '@/lib/journal/amount';
import { cn } from '@/lib/utils/cn';
import { amount, useAmounts } from './useAmounts';
import { AmountField, ResetButton } from './widgetParts';

const error = (msg: string) => <p className="text-sm text-rose-600 dark:text-rose-400">{msg}</p>;

/** 差異の表示（プラスは有利差異、マイナスは不利差異） */
function Variance({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <span className="flex-1 text-slate-600 dark:text-slate-300">{label}</span>
      <span
        className={cn(
          'text-right font-mono tabular-nums',
          value < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400',
        )}
      >
        {value === 0
          ? '0'
          : `${formatAmount(Math.abs(value))}（${value > 0 ? '有利差異・貸方' : '不利差異・借方'}）`}
      </span>
    </li>
  );
}

/** 総合原価計算（材料は始点投入） */
export function ProcessCostingWidget({ w }: { w: Extract<Widget, { type: 'process-costing' }> }) {
  const { values, set, reset } = useAmounts({
    beginQty: w.beginQty,
    beginProgress: w.beginProgress,
    beginMaterial: w.beginMaterial,
    beginConversion: w.beginConversion,
    material: w.material,
    conversion: w.conversion,
    completedQty: w.completedQty,
    endQty: w.endQty,
    endProgress: w.endProgress,
  });
  const [method, setMethod] = useState<'average' | 'fifo'>('average');
  const r = useMemo(
    () =>
      processCosting({
        beginQty: amount(values.beginQty),
        beginProgress: amount(values.beginProgress),
        beginMaterial: amount(values.beginMaterial),
        beginConversion: amount(values.beginConversion),
        material: amount(values.material),
        conversion: amount(values.conversion),
        completedQty: amount(values.completedQty),
        endQty: amount(values.endQty),
        endProgress: amount(values.endProgress),
        method,
      }),
    [values, method],
  );
  return (
    <>
      <p className="text-xs font-semibold text-slate-500">月初仕掛品</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AmountField label="数量" value={values.beginQty} onChange={set('beginQty')} />
        <AmountField
          label="進捗度（%）"
          value={values.beginProgress}
          onChange={set('beginProgress')}
        />
        <AmountField
          label="直接材料費"
          value={values.beginMaterial}
          onChange={set('beginMaterial')}
        />
        <AmountField
          label="加工費"
          value={values.beginConversion}
          onChange={set('beginConversion')}
        />
      </div>
      <p className="text-xs font-semibold text-slate-500">当月の投入・完成・月末</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AmountField label="当月の直接材料費" value={values.material} onChange={set('material')} />
        <AmountField label="当月の加工費" value={values.conversion} onChange={set('conversion')} />
        <AmountField
          label="完成品の数量"
          value={values.completedQty}
          onChange={set('completedQty')}
        />
        <AmountField label="月末仕掛品の数量" value={values.endQty} onChange={set('endQty')} />
        <AmountField
          label="月末の進捗度（%）"
          value={values.endProgress}
          onChange={set('endProgress')}
        />
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
          月末仕掛品の評価の方法
        </span>
        <Select
          value={method}
          onChange={(v) => setMethod(v as 'average' | 'fifo')}
          options={[
            { value: 'average', label: '平均法' },
            { value: 'fifo', label: '先入先出法' },
          ]}
          className="w-full"
        />
      </label>
      {r.error ? (
        error(r.error)
      ) : (
        <div className="space-y-2 text-sm">
          <ol className="list-decimal space-y-1 pl-5 leading-relaxed">
            {r.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p>
            月末仕掛品原価: <strong className="font-mono">{formatAmount(r.end.total)}</strong> ／
            完成品原価: <strong className="font-mono">{formatAmount(r.completed.total)}</strong>
            （単位原価 {r.completed.unit.toLocaleString('ja-JP')}）
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            直接材料は工程の始点で投入するとしています。金額は 1
            円未満を四捨五入し、完成品原価は差し引きで出しています。
          </p>
        </div>
      )}
      <ResetButton
        onClick={() => {
          reset();
          setMethod('average');
        }}
      />
    </>
  );
}

/** 製造間接費の予定配賦と差異分析（公式法変動予算） */
export function OverheadWidget({ w }: { w: Extract<Widget, { type: 'overhead' }> }) {
  const { values, set, reset } = useAmounts({
    variableBudget: w.variableBudget,
    fixedBudget: w.fixedBudget,
    normalHours: w.normalHours,
    actualHours: w.actualHours,
    actualCost: w.actualCost,
  });
  const r = useMemo(
    () =>
      overheadVariance({
        variableBudget: amount(values.variableBudget),
        fixedBudget: amount(values.fixedBudget),
        normalHours: amount(values.normalHours),
        actualHours: amount(values.actualHours),
        actualCost: amount(values.actualCost),
      }),
    [values],
  );
  const f = (n: number) => n.toLocaleString('ja-JP', { maximumFractionDigits: 2 });
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AmountField
          label="変動費の予算"
          value={values.variableBudget}
          onChange={set('variableBudget')}
        />
        <AmountField
          label="固定費の予算"
          value={values.fixedBudget}
          onChange={set('fixedBudget')}
        />
        <AmountField
          label="基準操業度（時間）"
          value={values.normalHours}
          onChange={set('normalHours')}
        />
        <AmountField
          label="実際操業度（時間）"
          value={values.actualHours}
          onChange={set('actualHours')}
        />
        <AmountField label="実際発生額" value={values.actualCost} onChange={set('actualCost')} />
      </div>
      {r.error ? (
        error(r.error)
      ) : (
        <div className="space-y-2 text-sm">
          <ul className="space-y-1 leading-relaxed">
            <li>
              予定配賦率 ＝ 変動費率 {f(r.variableRate)} ＋ 固定費率 {f(r.fixedRate)} ＝ {f(r.rate)}{' '}
              円／時間
            </li>
            <li>
              予定配賦額 ＝ {f(r.rate)} × {values.actualHours} 時間 ＝{' '}
              <span className="font-mono">{formatAmount(r.applied)}</span>
            </li>
            <li>
              予算許容額 ＝ {f(r.variableRate)} × {values.actualHours} ＋ 固定費{' '}
              {values.fixedBudget} ＝ <span className="font-mono">{formatAmount(r.allowed)}</span>
            </li>
          </ul>
          <ul className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <Variance label="製造間接費配賦差異（予定配賦額 − 実際発生額）" value={r.total} />
            <Variance label="うち 予算差異（予算許容額 − 実際発生額）" value={r.budget} />
            <Variance label="うち 操業度差異（固定費率 ×（実際 − 基準操業度））" value={r.volume} />
          </ul>
        </div>
      )}
      <ResetButton onClick={reset} />
    </>
  );
}

/** 標準原価計算（直接材料費差異） */
export function StandardCostWidget({ w }: { w: Extract<Widget, { type: 'standard-cost' }> }) {
  const { values, set, reset } = useAmounts({
    standardPrice: w.standardPrice,
    standardQty: w.standardQty,
    actualPrice: w.actualPrice,
    actualQty: w.actualQty,
  });
  const nums = Object.values(values).map(amount);
  const valid = nums.every((n) => Number.isFinite(n) && n >= 0);
  const r = useMemo(
    () =>
      valid
        ? materialVariance({
            standardPrice: amount(values.standardPrice),
            standardQty: amount(values.standardQty),
            actualPrice: amount(values.actualPrice),
            actualQty: amount(values.actualQty),
          })
        : null,
    [valid, values],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField
          label="標準単価"
          value={values.standardPrice}
          onChange={set('standardPrice')}
        />
        <AmountField label="標準消費量" value={values.standardQty} onChange={set('standardQty')} />
        <AmountField label="実際単価" value={values.actualPrice} onChange={set('actualPrice')} />
        <AmountField label="実際消費量" value={values.actualQty} onChange={set('actualQty')} />
      </div>
      {r ? (
        <div className="space-y-2 text-sm">
          <p>
            標準原価 {formatAmount(r.standardCost)} − 実際原価 {formatAmount(r.actualCost)}
          </p>
          <ul className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <Variance label="直接材料費差異" value={r.total} />
            <Variance
              label="うち 価格差異（（標準単価 − 実際単価）× 実際消費量）"
              value={r.price}
            />
            <Variance
              label="うち 数量差異（標準単価 ×（標準消費量 − 実際消費量））"
              value={r.quantity}
            />
          </ul>
          <p className="text-xs leading-relaxed text-slate-500">
            直接労務費も同じ形で、賃率差異（価格）と作業時間差異（数量）に分けます。
          </p>
        </div>
      ) : (
        error('数値を 0 以上で入れてください')
      )}
      <ResetButton onClick={reset} />
    </>
  );
}

/** CVP 分析（損益分岐点） */
export function CvpWidget({ w }: { w: Extract<Widget, { type: 'cvp' }> }) {
  const { values, set, reset } = useAmounts({
    sales: w.sales,
    variableCosts: w.variableCosts,
    fixedCosts: w.fixedCosts,
    targetProfit: w.targetProfit,
  });
  const nums = Object.values(values).map(amount);
  const valid = nums.every((n) => Number.isFinite(n) && n >= 0);
  const r = useMemo(
    () =>
      valid
        ? cvp({
            sales: amount(values.sales),
            variableCosts: amount(values.variableCosts),
            fixedCosts: amount(values.fixedCosts),
            targetProfit: amount(values.targetProfit),
          })
        : null,
    [valid, values],
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AmountField label="売上高" value={values.sales} onChange={set('sales')} />
        <AmountField label="変動費" value={values.variableCosts} onChange={set('variableCosts')} />
        <AmountField label="固定費" value={values.fixedCosts} onChange={set('fixedCosts')} />
        <AmountField
          label="目標営業利益"
          value={values.targetProfit}
          onChange={set('targetProfit')}
        />
      </div>
      {r ? (
        <ul className="space-y-1 text-sm leading-relaxed">
          <li>
            限界利益 {formatAmount(r.contributionMargin)}（限界利益率 {r.contributionRatio}
            %）・営業利益 {formatAmount(r.operatingIncome)}
          </li>
          <li>
            損益分岐点の売上高 ＝ 固定費 ÷ 限界利益率 ＝{' '}
            <strong className="font-mono">
              {r.breakEvenSales === null ? '—（限界利益がない）' : formatAmount(r.breakEvenSales)}
            </strong>
          </li>
          <li>
            安全余裕率 ＝（売上高 − 損益分岐点）÷ 売上高 ＝{' '}
            <strong className="font-mono">
              {r.safetyMargin === null ? '—' : `${r.safetyMargin}%`}
            </strong>
          </li>
          <li>
            目標営業利益を出す売上高 ＝（固定費 ＋ 目標利益）÷ 限界利益率 ＝{' '}
            <strong className="font-mono">
              {r.targetSales === null ? '—' : formatAmount(r.targetSales)}
            </strong>
          </li>
        </ul>
      ) : (
        error('金額を 0 以上で入れてください')
      )}
      <ResetButton onClick={reset} />
    </>
  );
}
