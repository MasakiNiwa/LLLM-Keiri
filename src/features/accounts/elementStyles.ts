import type { Element } from '@/lib/content/schema';

/** 区分ごとの色（色だけに頼らず、必ず区分名の文字も添える） */
export const ELEMENT_STYLES: Record<Element, string> = {
  asset: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  liability: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  equity: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  revenue: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  expense: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  other: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};
