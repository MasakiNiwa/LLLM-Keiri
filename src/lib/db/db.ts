import Dexie, { type EntityTable } from 'dexie';
import { STORAGE_PREFIX } from '@/lib/constants';

/** レッスンの進み具合 */
export interface LessonProgress {
  lessonId: string;
  /** 読んだ印を付けた日時（付けていなければ undefined） */
  readAt?: number;
  /** 最後に開いた日時 */
  openedAt: number;
}

/**
 * このアプリのデータベース（IndexedDB）。
 * テーブルを増やすときは version を上げて stores に足す（既存のデータは残る）。
 */
export class KeiriDB extends Dexie {
  lessonProgress!: EntityTable<LessonProgress, 'lessonId'>;

  constructor(name = STORAGE_PREFIX) {
    super(name);
    this.version(1).stores({
      lessonProgress: 'lessonId, readAt, openedAt',
    });
  }
}

export const db = new KeiriDB();
