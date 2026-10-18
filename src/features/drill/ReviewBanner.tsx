import { CalendarCheck, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { Card } from '@/components/ui/Card';
import { useReviewSummary } from './reviewRepo';

/** 今日の復習の数（ホーム・練習の一覧に出す。まだ何も解いていなければ出さない） */
export function ReviewBanner() {
  const s = useReviewSummary();
  if (!s || s.total === 0) return null;
  const n = s.due.length;
  return (
    <Link href="/review" className="group block">
      <Card className="flex items-center gap-3 p-4 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          <CalendarCheck className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">
            {n > 0 ? `今日の復習 ${n} 問` : '今日の復習は終わりました'}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">
            {n > 0
              ? '間違えた問題・忘れかけた問題を、ちょうどよい日に出し直します'
              : s.next
                ? `次の復習は ${new Date(s.next).toLocaleDateString('ja-JP')}`
                : ''}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-slate-400" />
      </Card>
    </Link>
  );
}
