import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils/cn';
import { HELP_ITEM } from './navItems';
import { ThemeToggle } from './ThemeToggle';

interface PageHeaderProps {
  title: string;
  /** タイトル右側（見出しの横）に置く要素 */
  meta?: ReactNode;
  /** 右端のアクション（ダークモード・ヘルプのボタンの左に並ぶ） */
  actions?: ReactNode;
  /** 戻る先（指定すると、タイトルの左に戻るボタンを置く） */
  back?: ReactNode;
  /** スマホではタイトルを隠す（ヘッダーの幅を確保） */
  hideTitleOnMobile?: boolean;
}

const iconButton =
  'flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800';

/** ヘッダー右端のヘルプ（ヘルプページでは押せない表示にする） */
function HelpButton() {
  const [location] = useLocation();
  const here = location === HELP_ITEM.to;
  return (
    <Link
      href={HELP_ITEM.to}
      aria-label={HELP_ITEM.label}
      title={HELP_ITEM.label}
      aria-current={here ? 'page' : undefined}
      className={cn(iconButton, here && 'text-accent-700 dark:text-accent-300')}
    >
      <HELP_ITEM.icon className="size-5" />
    </Link>
  );
}

/**
 * アプリのヘッダー。どのページでも右端にダークモードの切り替えとヘルプを置く。
 * （GitHub へのリンクはヘッダーに置かない方針。リポジトリへのリンクはヘルプページのみ）
 */
export function PageHeader({ title, meta, actions, back, hideTitleOnMobile }: PageHeaderProps) {
  return (
    <header className="pt-safe sticky top-0 z-20 shrink-0 border-b border-slate-200 bg-slate-50/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
        {back ?? <img src="./favicon.svg" alt="" className="size-7 md:hidden" />}
        <h1
          className={cn(
            'min-w-0 truncate text-base font-semibold sm:text-lg',
            hideTitleOnMobile && 'max-sm:sr-only',
          )}
        >
          {title}
        </h1>
        {meta && <div className="min-w-0">{meta}</div>}
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {actions}
          <ThemeToggle />
          <HelpButton />
        </div>
      </div>
    </header>
  );
}

/** スクロール可能なページ本体 */
export function PageBody({
  children,
  wide,
  className,
}: {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto" data-scroll-root>
      <div
        className={cn(
          'mx-auto w-full space-y-4 px-3 py-4 sm:px-4 sm:py-6',
          wide ? 'max-w-5xl' : 'max-w-3xl',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
