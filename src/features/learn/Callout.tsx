import type { ReactNode } from 'react';
import { AlertTriangle, Info, Lightbulb, Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { CalloutType } from './remarkPlugins';

const STYLES: Record<CalloutType, { label: string; icon: ReactNode; className: string }> = {
  point: {
    label: 'ポイント',
    icon: <Star />,
    className:
      'border-accent-300 bg-accent-50/70 text-accent-900 dark:border-accent-700 dark:bg-accent-900/20 dark:text-accent-100',
  },
  note: {
    label: '補足',
    icon: <Info />,
    className:
      'border-sky-300 bg-sky-50/70 text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100',
  },
  tip: {
    label: 'コツ',
    icon: <Lightbulb />,
    className:
      'border-emerald-300 bg-emerald-50/70 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100',
  },
  warning: {
    label: '注意',
    icon: <AlertTriangle />,
    className:
      'border-amber-300 bg-amber-50/70 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100',
  },
};

export function Callout({ type, children }: { type: CalloutType; children: ReactNode }) {
  const s = STYLES[type];
  return (
    <aside className={cn('my-4 rounded-xl border-l-4 px-4 py-3', s.className)}>
      <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold [&_svg]:size-4">
        {s.icon}
        {s.label}
      </div>
      <div className="space-y-2 [&>p]:leading-relaxed">{children}</div>
    </aside>
  );
}
