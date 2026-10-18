import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import {
  BACKUP_TABLES,
  backupCounts,
  backupFileName,
  exportBackup,
  importBackup,
  parseBackup,
  type Backup,
  type BackupTable,
} from '@/lib/db/backup';
import { db } from '@/lib/db/db';
import { downloadText } from '@/lib/utils/download';
import { errorMessage } from '@/lib/utils/format';
import { useSettings } from './settingsStore';

/** 設定（関数を除いた値だけ） */
function settingsSnapshot(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(useSettings.getState())) as Record<string, unknown>;
}

/** 学習データのバックアップ（書き出し）と復元（読み込み） */
export function BackupControls() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const [withSettings, setWithSettings] = useState(true);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    try {
      const b = await exportBackup(db, {
        settings: settingsSnapshot(),
        appVersion: __APP_VERSION__,
      });
      downloadText(backupFileName(), JSON.stringify(b), 'application/json');
      const c = backupCounts(b);
      toast.success(
        `書き出しました（仕訳 ${c.journal} 件・答え合わせ ${c.drillAttempts} 件・マイ教材 ${c.userContent} 件など）`,
      );
    } catch (e) {
      toast.error(`書き出せませんでした: ${errorMessage(e)}`);
    }
  };

  const open = async (file: File) => {
    try {
      setPending(parseBackup(await file.text()));
      setWithSettings(true);
    } catch (e) {
      toast.error(`読み込めませんでした: ${errorMessage(e)}`);
    }
  };

  const restore = async (mode: 'merge' | 'replace') => {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(db, pending, mode);
      if (withSettings && pending.settings) useSettings.setState(pending.settings);
      toast.success('復元しました。読み込み直します');
      setPending(null);
      // 画面が持っている古い状態を捨てるため、読み込み直す
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      toast.error(`復元できませんでした: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const counts = pending ? backupCounts(pending) : null;
  return (
    <>
      <Field
        label="バックアップを書き出す"
        hint="学習記録・復習の予定・帳簿・マイ教材・チャット・設定を 1 つのファイルに保存します（AI モデルは含みません）。ほかの端末への引っ越しにも使えます"
      >
        <Button size="sm" onClick={() => void save()}>
          <Download />
          書き出す
        </Button>
      </Field>
      <Field label="バックアップから復元する" hint="書き出したファイルを選びます">
        <Button size="sm" onClick={() => fileRef.current?.click()}>
          <Upload />
          ファイルを選ぶ
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void open(f);
          }}
        />
      </Field>
      <Dialog
        open={!!pending}
        title="バックアップから復元"
        onClose={() => setPending(null)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              やめる
            </Button>
            <Button onClick={() => void restore('merge')} disabled={busy}>
              今のデータに足す
            </Button>
            <Button variant="danger" onClick={() => void restore('replace')} disabled={busy}>
              置き換える
            </Button>
          </div>
        }
      >
        {pending && counts && (
          <div className="space-y-3 text-sm">
            <p>
              {new Date(pending.exportedAt).toLocaleString('ja-JP')} に書き出したバックアップです
              {pending.appVersion ? `（v${pending.appVersion}）` : ''}。
            </p>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
              {(Object.keys(BACKUP_TABLES) as BackupTable[]).map((t) => (
                <li key={t} className="flex gap-2 px-3 py-1.5">
                  <span className="flex-1">{BACKUP_TABLES[t]}</span>
                  <span className="font-mono tabular-nums">{counts[t]} 件</span>
                </li>
              ))}
            </ul>
            {pending.settings && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={withSettings}
                  onChange={(e) => setWithSettings(e.target.checked)}
                />
                設定も復元する
              </label>
            )}
            <p className="text-xs leading-relaxed text-slate-500">
              「今のデータに足す」は、同じ記録を上書きし、ほかは残します。「置き換える」は、今の学習記録・帳簿・マイ教材・チャットを消してから入れます（元に戻せません）。
            </p>
          </div>
        )}
      </Dialog>
    </>
  );
}
