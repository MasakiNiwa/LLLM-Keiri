import { Children, type ReactNode } from 'react';
import { useAccountSheet } from '@/features/accounts/accountSheetStore';
import { useContent } from '@/features/content/contentStore';
import { findTerm } from '@/lib/content/glossary';

/**
 * レッスンの太字。用語集の用語か勘定科目の名前と一致すれば、押して説明を開ける。
 */
export function TermStrong({ children }: { children?: ReactNode }) {
  const book = useContent((s) => s.book);
  const glossary = useContent((s) => s.index?.glossary);
  const open = useAccountSheet((s) => s.open);
  const parts = Children.toArray(children);
  const text = parts.every((p) => typeof p === 'string') ? parts.join('') : null;
  const name = text && (book?.find(text)?.name ?? findTerm(glossary, text)?.term);
  if (!name) return <strong>{children}</strong>;
  return (
    <strong>
      <button
        type="button"
        onClick={() => open(name)}
        className="font-bold underline decoration-accent-400/70 decoration-dotted underline-offset-4 hover:text-accent-700 dark:decoration-accent-500/60 dark:hover:text-accent-300"
        title={`「${name}」の説明`}
      >
        {children}
      </button>
    </strong>
  );
}
