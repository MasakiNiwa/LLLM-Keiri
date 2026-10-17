import { Construction } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Card } from '@/components/ui/Card';

/** まだ作っていないページ（ロードマップのフェーズを表示する） */
export function ComingSoon({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children?: string;
}) {
  return (
    <>
      <PageHeader title={title} />
      <PageBody>
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <Construction className="size-10 text-accent-600 dark:text-accent-400" />
          <h2 className="text-lg font-semibold">準備中です</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {children ?? `このページはロードマップの${phase}で作ります。`}
          </p>
        </Card>
      </PageBody>
    </>
  );
}
