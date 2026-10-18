import type { ReactNode } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

interface DrillSheetProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  /** たどってきた道（最後が今の画面） */
  trail: string[];
  onBack: () => void;
  onClose: () => void;
  children: ReactNode;
}

/** ドリルダウンの中身を表示するシート（たどってきた道と、戻るボタン付き） */
export function DrillSheet({
  open,
  title,
  description,
  trail,
  onBack,
  onClose,
  children,
}: DrillSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title} description={description} expandable>
      {trail.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <button
            type="button"
            onClick={onBack}
            className="mr-1 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="size-3.5" />
            戻る
          </button>
          {trail.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3" />}
              <span
                className={
                  i === trail.length - 1 ? 'font-medium text-slate-700 dark:text-slate-200' : ''
                }
              >
                {t}
              </span>
            </span>
          ))}
        </div>
      )}
      {children}
    </BottomSheet>
  );
}
