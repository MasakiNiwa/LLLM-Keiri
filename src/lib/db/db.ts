import Dexie, { type EntityTable } from 'dexie';
import { STORAGE_PREFIX } from '@/lib/constants';
import type { ConsolidationCase, DrillSet, Lesson } from '@/lib/content/schema';
import type { JournalLine } from '@/lib/journal/types';
import type { ReviewFields } from '@/lib/srs/review';

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
  /** AI 練習で始めた発話なら、その練習の名前（吹き出しに表示する） */
  practice?: string;
  thinking?: string;
  /** 使ったツール */
  tools?: string[];
  error?: string;
  createdAt: number;
}

/** 外部 AI などで作って取り込んだ教材（マイ教材） */
export type UserContent =
  | { id: string; kind: 'lesson'; title: string; data: Lesson; createdAt: number }
  | { id: string; kind: 'drill'; title: string; data: DrillSet; createdAt: number }
  | {
      id: string;
      kind: 'consolidation';
      title: string;
      data: ConsolidationCase;
      createdAt: number;
    };

/** 仕訳問題の復習の予定（FSRS） */
export interface ReviewRecord extends ReviewFields {
  /** setId と questionId をつないだもの */
  key: string;
  setId: string;
  questionId: string;
  updatedAt: number;
}

/** 学習の記録（何日に何を学んだか）。レッスンを開いた・読んだなど、ほかの表に日付が残らないものを記録する */
export interface ActivityRecord {
  id?: number;
  at: number;
  kind: 'lesson-open' | 'lesson-read';
  /** レッスンの id など */
  refId: string;
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
  userContent!: EntityTable<UserContent, 'id'>;
  reviews!: EntityTable<ReviewRecord, 'key'>;
  activity!: EntityTable<ActivityRecord, 'id'>;

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
    this.version(5).stores({
      userContent: 'id, kind, createdAt',
    });
    this.version(6).stores({
      reviews: 'key, due, setId',
    });
    this.version(7).stores({
      activity: '++id, at, kind, refId',
    });
  }
}

export const db = new KeiriDB();
