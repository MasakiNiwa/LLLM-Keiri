import { ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { ACCOUNTS_ITEM, NAV_ITEMS, STUDIO_ITEM } from '@/app/navItems';
import { Card } from '@/components/ui/Card';
import { ContinueCard } from '@/features/home/ContinueCard';
import { Greeting } from '@/features/home/Greeting';
import { useFocus } from '@/features/ai/useFocus';
import { APP_TAGLINE, APP_TITLE } from '@/lib/constants';

const MENU = [...NAV_ITEMS.filter((n) => n.to !== '/'), ACCOUNTS_ITEM, STUDIO_ITEM];

export default function HomePage() {
  useFocus({ kind: 'home' });
  return (
    <>
      <PageHeader title={APP_TITLE} />
      <PageBody>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-accent-50 to-white p-5 sm:p-6 dark:from-accent-900/30 dark:to-slate-900">
            <p className="text-sm font-medium text-accent-700 dark:text-accent-300">ようこそ</p>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl">{APP_TAGLINE}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              仕訳・帳簿・決算・税務を、手を動かしながら学べます。正誤の判定や集計はプログラムが正確に行い、
              ブラウザの中で動く AI が解説やリアクションで学習を手伝います。
            </p>
          </div>
        </Card>

        <Greeting />
        <ContinueCard />

        <div className="grid gap-3 sm:grid-cols-2">
          {MENU.map(({ to, label, icon: Icon, description }) => (
            <Link key={to} href={to} className="group">
              <Card className="flex h-full items-center gap-3 p-4 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    {description}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-slate-400" />
              </Card>
            </Link>
          ))}
        </div>
      </PageBody>
    </>
  );
}
