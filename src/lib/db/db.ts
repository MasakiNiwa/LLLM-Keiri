import Dexie, { type EntityTable } from 'dexie';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { JournalLine } from '@/lib/journal/types';

/** レッスンの進み具合 */
export interface LessonProgress {
  lessonId: string;
  /** 読んだ印を付けた日時（付けていなければ undefined） */
  readAt?: number;
  /** 最後に開いた日時 */
  openedAt: number;
}

/** 仕訳問題の答え合わせの記録（1 問につき、答え合わせのたびに 1 件） */
export interface DrillAttempt {
  id?: number;
  setId: string;
  questionId: string;
  correct: boolean;
  /** 答えを見てから答え合わせした */
  revealed: boolean;
  /** 採点の種類（judge.ts の JudgeKind） */
  kind: string;
  at: number;
}

/** 帳簿（自分で入れた仕訳） */
export interface JournalRecord {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  memo: string;
  lines: JournalLine[];
  createdAt: number;
}

/** AI とのチャットの 1 発言 */
export interface ChatRecord {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** ユーザーの発話の前に付けたアプリの状態（<app_state>）やヘルプの抜粋 */
  context?: string;
  thinking?: string;
  /** 使ったツール */
  tools?: string[];
  error?: string;
  createdAt: number;
}

/**
 * このアプリのデータベース（IndexedDB）。
 * テーブルを増やすときは version を上げて stores に足す（既存のデータは残る）。
 */
export class KeiriDB extends Dexie {
  lessonProgress!: EntityTable<LessonProgress, 'lessonId'>;
  drillAttempts!: EntityTable<DrillAttempt, 'id'>;
  journal!: EntityTable<JournalRecord, 'id'>;
  chat!: EntityTable<ChatRecord, 'id'>;

  constructor(name = STORAGE_PREFIX) {
    super(name);
    this.version(1).stores({
      lessonProgress: 'lessonId, readAt, openedAt',
    });
    this.version(2).stores({
      drillAttempts: '++id, setId, [setId+questionId], at',
    });
    this.version(3).stores({
      journal: 'id, date, createdAt',
    });
    this.version(4).stores({
      chat: 'id, createdAt',
    });
  }
}

export const db = new KeiriDB();
