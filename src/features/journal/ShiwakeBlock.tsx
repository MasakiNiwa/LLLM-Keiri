import { useMemo } from 'react';
import { parseShiwake } from '@/lib/journal/parse';
import { JournalTable } from './JournalTable';

/** 仕訳の書き方（` ```shiwake `）を表で表示する */
export function ShiwakeBlock({ text }: { text: string }) {
  const { entries, issues } = useMemo(() => parseShiwake(text), [text]);
  return (
    <div className="my-4 space-y-2.5">
      {entries.map((e, i) => (
        <JournalTable key={i} entry={e} />
      ))}
      {issues.length > 0 && (
        <pre className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {issues.map((i) => `${i.line} 行目: ${i.message}`).join('\n')}
        </pre>
      )}
    </div>
  );
}
