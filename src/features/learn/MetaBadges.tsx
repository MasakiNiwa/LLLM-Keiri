import { CalendarClock, ExternalLink, Gauge, ScrollText } from 'lucide-react';
import type { Basis } from '@/lib/content/schema';
import { formatDate, LEVEL_LABELS } from './meta';

export function LevelBadge({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <Gauge className="size-3.5" />
      {LEVEL_LABELS[level] ?? `レベル ${level}`}
    </span>
  );
}

/** 根拠と基準日（会計基準・税制の改正に追従するための表示） */
export function BasisInfo({
  basis,
  asOf,
  updated,
}: {
  basis: Basis[];
  asOf: string;
  updated: string;
}) {
  return (
    <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
      <p className="flex items-center gap-1.5">
        <CalendarClock className="size-3.5 shrink-0" />
        {formatDate(asOf)} 時点の基準・法令に基づく内容（更新 {formatDate(updated)}）
      </p>
      {basis.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <ScrollText className="size-3.5 shrink-0" />
          根拠:
          {basis.map((b) =>
            b.url ? (
              <a
                key={b.name}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-accent-700 hover:underline dark:text-accent-300"
              >
                {b.name}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <span key={b.name}>{b.name}</span>
            ),
          )}
        </p>
      )}
    </div>
  );
}
