import type { Rule } from './schema.ts';

/**
 * その日に適用される値を返す（税率など）。期間外なら undefined。
 * date は YYYY-MM-DD（文字列のまま比べられる）。
 */
export function ruleValueAt(rule: Rule, date: string): number | undefined {
  return rule.values.find((v) => v.from <= date && (v.to === undefined || date <= v.to))?.value;
}

/** 今日の日付（YYYY-MM-DD、端末の時刻） */
export function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
