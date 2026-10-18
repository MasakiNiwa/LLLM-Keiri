/**
 * 学習データのバックアップ（1 つの JSON ファイルへの書き出し）と復元。
 * AI モデル（共有の保存領域）は大きいので含めない。
 */
import { z } from 'zod';
import type { KeiriDB } from './db.ts';

export const BACKUP_FORMAT = 'lllm-keiri-backup';
export const BACKUP_VERSION = 1;

/** バックアップに含めるテーブルと、その表示名 */
export const BACKUP_TABLES = {
  lessonProgress: 'レッスンの進み具合',
  drillAttempts: '問題の答え合わせの記録',
  reviews: '復習の予定',
  journal: '帳簿の仕訳',
  userContent: 'マイ教材',
  chat: 'AI とのチャット',
  activity: '学習の記録（レッスンを開いた・読んだ日）',
} as const;
export type BackupTable = keyof typeof BACKUP_TABLES;
const TABLE_NAMES = Object.keys(BACKUP_TABLES) as BackupTable[];

const BackupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: z.string(),
  appVersion: z.string().optional(),
  tables: z.object(
    Object.fromEntries(
      TABLE_NAMES.map((t) => [t, z.array(z.record(z.string(), z.unknown())).default([])]),
    ) as Record<BackupTable, z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>,
  ),
  /** 設定（表示・AI など） */
  settings: z.record(z.string(), z.unknown()).optional(),
});
export type Backup = z.infer<typeof BackupSchema>;

export type BackupCounts = Record<BackupTable, number>;

/** 書き出す */
export async function exportBackup(
  db: KeiriDB,
  options: { settings?: Record<string, unknown>; appVersion?: string; now?: Date } = {},
): Promise<Backup> {
  const tables = {} as Backup['tables'];
  await db.transaction(
    'r',
    TABLE_NAMES.map((t) => db.table(t)),
    async () => {
      for (const t of TABLE_NAMES)
        tables[t] = (await db.table(t).toArray()) as Record<string, unknown>[];
    },
  );
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: (options.now ?? new Date()).toISOString(),
    appVersion: options.appVersion,
    tables,
    settings: options.settings,
  };
}

export function backupCounts(b: Pick<Backup, 'tables'>): BackupCounts {
  return Object.fromEntries(TABLE_NAMES.map((t) => [t, b.tables[t]?.length ?? 0])) as BackupCounts;
}

/** ファイルの中身を読む。形式が違えば理由を投げる */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSON として読めません');
  }
  const r = BackupSchema.safeParse(data);
  if (!r.success) {
    const fmt = (data as { format?: unknown } | null)?.format;
    throw new Error(
      fmt !== BACKUP_FORMAT
        ? 'LLLM 経理のバックアップのファイルではありません'
        : `バックアップの形式が正しくありません（${r.error.issues[0]?.path.join('.') ?? ''}）`,
    );
  }
  return r.data;
}

/**
 * 復元する。
 * - merge: 今のデータに足す（同じ id は上書き。答え合わせの記録は同じものを二重にしない）
 * - replace: 今のデータを消してから入れる
 */
export async function importBackup(
  db: KeiriDB,
  backup: Backup,
  mode: 'merge' | 'replace',
): Promise<BackupCounts> {
  const counts = {} as BackupCounts;
  await db.transaction(
    'rw',
    TABLE_NAMES.map((t) => db.table(t)),
    async () => {
      for (const t of TABLE_NAMES) {
        const table = db.table(t);
        let rows = backup.tables[t] ?? [];
        if (mode === 'replace') await table.clear();
        if (t === 'drillAttempts') {
          // 自動の番号は付け直す。同じ記録（問題・時刻・結果）がすでにあれば足さない
          const existing =
            mode === 'merge'
              ? new Set(((await table.toArray()) as Record<string, unknown>[]).map(attemptKey))
              : new Set<string>();
          rows = rows
            .filter((r) => !existing.has(attemptKey(r)))
            .map(({ id: _id, ...rest }) => rest);
          await table.bulkAdd(rows);
        } else {
          await table.bulkPut(rows);
        }
        counts[t] = rows.length;
      }
    },
  );
  return counts;
}

function attemptKey(r: Record<string, unknown>): string {
  return `${String(r.setId)}|${String(r.questionId)}|${String(r.at)}|${String(r.correct)}`;
}

/** ファイル名（例: lllm-keiri-backup-2026-10-18.json） */
export function backupFileName(now = new Date()): string {
  const d = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return `lllm-keiri-backup-${d}.json`;
}
