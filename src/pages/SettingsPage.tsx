import { useEffect, useState } from 'react';
import { Database, Palette, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { DARK_PALETTE_LABELS, THEME_LABELS } from '@/features/settings/labels';
import {
  FONT_SCALES,
  useSettings,
  type DarkPalette,
  type FontScale,
  type ThemeSetting,
} from '@/features/settings/settingsStore';
import { db } from '@/lib/db/db';
import { clearAppData } from '@/lib/storage/clearData';
import { cn } from '@/lib/utils/cn';
import { errorMessage, formatBytes } from '@/lib/utils/format';

/** ダークモードの配色の見本（背景・カード・アクセント・文字） */
const SWATCHES: Record<DarkPalette, [string, string, string, string]> = {
  neutral: ['#212121', '#2f2f2f', '#4f7b77', '#ececec'],
  warm: ['#262624', '#33322f', '#a86a52', '#eeece6'],
  vivid: ['#020617', '#0f172a', '#0d9488', '#f1f5f9'],
};

function PaletteSwatch({ palette }: { palette: DarkPalette }) {
  const [bg, card, accent, text] = SWATCHES[palette];
  return (
    <span
      className="flex size-11 shrink-0 flex-col justify-center gap-1 rounded-lg p-1.5 ring-1 ring-slate-300 dark:ring-slate-600"
      style={{ background: bg }}
      aria-hidden
    >
      <span className="h-2 rounded-sm" style={{ background: card }} />
      <span className="h-1.5 w-2/3 rounded-sm" style={{ background: text }} />
      <span className="h-2 w-1/2 rounded-sm" style={{ background: accent }} />
    </span>
  );
}

function StorageUsage() {
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    void navigator.storage
      ?.estimate?.()
      .then((e) => setEst({ usage: e.usage ?? 0, quota: e.quota ?? 0 }));
  }, []);
  if (!est) return <span className="text-sm text-slate-500">-</span>;
  return (
    <span className="font-mono text-sm tabular-nums">
      {formatBytes(est.usage)} / {formatBytes(est.quota)}
    </span>
  );
}

type ConfirmKind = null | 'reset' | 'progress' | 'all';

export default function SettingsPage() {
  const s = useSettings();
  const update = s.update;
  const [confirm, setConfirm] = useState<ConfirmKind>(null);

  const clearAll = async () => {
    try {
      await clearAppData();
      toast.success('このアプリのデータを消しました');
      // 画面が持っている古い状態を捨てるため、読み込み直す
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      toast.error(`消せませんでした: ${errorMessage(e)}`);
    }
  };

  return (
    <>
      <PageHeader title="設定" />
      <PageBody>
        <Section collapsible defaultOpen storageKey="settings" title="表示" icon={<Palette />}>
          <Field
            label="テーマ"
            htmlFor="theme"
            hint="ヘッダーの太陽・月のボタンでも切り替えられます"
          >
            <Select
              id="theme"
              value={s.theme}
              onChange={(v) => update({ theme: v as ThemeSetting })}
              options={(Object.keys(THEME_LABELS) as ThemeSetting[]).map((v) => ({
                value: v,
                label: THEME_LABELS[v],
              }))}
              className="w-44"
            />
          </Field>
          <Field
            label="ダークモードの配色"
            hint="ダークモードのときの色合い。落ち着いた配色は、彩度を抑えて長く見ていても疲れにくくしています"
            stacked
          >
            <div
              className="grid gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label="ダークモードの配色"
            >
              {(Object.keys(DARK_PALETTE_LABELS) as DarkPalette[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={s.darkPalette === k}
                  onClick={() => update({ darkPalette: k })}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
                    s.darkPalette === k
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                  )}
                >
                  <PaletteSwatch palette={k} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {DARK_PALETTE_LABELS[k].label}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {DARK_PALETTE_LABELS[k].hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="本文の文字の大きさ" htmlFor="font-scale" hint="レッスン・問題の文字">
            <Select
              id="font-scale"
              value={s.fontScale}
              onChange={(v) => update({ fontScale: v as FontScale })}
              options={(Object.keys(FONT_SCALES) as FontScale[]).map((v) => ({
                value: v,
                label: FONT_SCALES[v].label,
              }))}
              className="w-32"
            />
          </Field>
        </Section>

        <Section collapsible storageKey="settings" title="データ" icon={<Database />}>
          <Field
            label="使用中の保存領域"
            hint="同じ github.io のほかのサイト（共有の AI モデルなど）の分も含みます"
          >
            <StorageUsage />
          </Field>
          <Field label="設定を初期値に戻す" hint="学習記録やデータは消えません">
            <Button size="sm" onClick={() => setConfirm('reset')}>
              <RotateCcw />
              戻す
            </Button>
          </Field>
          <Field
            label="学習記録を消す"
            hint="読んだレッスンの印と、問題の答え合わせの記録を消します"
          >
            <Button size="sm" onClick={() => setConfirm('progress')}>
              <Trash2 />
              クリア
            </Button>
          </Field>
          <Field
            label="すべてのデータを消す"
            hint="設定・学習記録・帳簿・チャットなど、このアプリのデータをすべて消します。AI モデルは消えません"
          >
            <Button size="sm" variant="danger" onClick={() => setConfirm('all')}>
              <Trash2 />
              クリア
            </Button>
          </Field>
        </Section>
      </PageBody>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="設定を初期値に戻しますか？"
        description="表示や AI の設定が初期値に戻ります。学習記録やデータは消えません。"
        confirmLabel="戻す"
        onConfirm={() => {
          s.reset();
          toast.success('設定を初期値に戻しました');
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'progress'}
        title="学習記録を消しますか？"
        description="読んだレッスンの印と、問題の答え合わせの記録を消します。帳簿やチャットは残ります。元に戻せません。"
        confirmLabel="消す"
        danger
        onConfirm={() =>
          void Promise.all([db.lessonProgress.clear(), db.drillAttempts.clear()]).then(
            () => toast.success('学習記録を消しました'),
            (e) => toast.error(`消せませんでした: ${errorMessage(e)}`),
          )
        }
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'all'}
        title="すべてのデータを消しますか？"
        description="このアプリの設定・学習記録・帳簿の仕訳・チャットの履歴をすべて消します。元に戻せません。ダウンロードした AI モデル（ほかのサイトと共有）は消えません。"
        confirmLabel="すべて消す"
        danger
        onConfirm={() => void clearAll()}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
