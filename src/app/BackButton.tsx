import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

/** ヘッダー左端の戻るボタン */
export function BackButton({ to, label = '戻る' }: { to: string; label?: string }) {
  return (
    <Link
      href={to}
      aria-label={label}
      title={label}
      className="-ml-1 flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <ArrowLeft className="size-5" />
    </Link>
  );
}
