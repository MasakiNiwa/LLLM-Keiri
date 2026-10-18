/**
 * RCM の演習の採点（プログラムが行う）。
 * リスクごとに、コントロールの手順・アサーション・予防/発見・手作業/自動 の 4 つを比べる。
 */
import type { RcmCase } from '../content/schema.ts';

type Risk = RcmCase['risks'][number];

export interface RcmAnswer {
  control: string;
  assertion: string;
  type: string;
  method: string;
}

export const RCM_FIELDS = ['control', 'assertion', 'type', 'method'] as const;
export type RcmField = (typeof RCM_FIELDS)[number];

export const RCM_FIELD_LABELS: Record<RcmField, string> = {
  control: 'コントロール（手順）',
  assertion: 'アサーション',
  type: '予防・発見',
  method: '手作業・自動',
};

export interface RcmGrade {
  fields: Record<RcmField, boolean>;
  correct: boolean;
  /** 未選択の項目があるか */
  incomplete: boolean;
}

export function gradeRisk(risk: Risk, answer: Partial<RcmAnswer>): RcmGrade {
  const fields = {
    control: answer.control === risk.control,
    assertion: answer.assertion === risk.assertion,
    type: answer.type === risk.type,
    method: answer.method === risk.method,
  };
  return {
    fields,
    correct: RCM_FIELDS.every((f) => fields[f]),
    incomplete: RCM_FIELDS.some((f) => !answer[f]),
  };
}
