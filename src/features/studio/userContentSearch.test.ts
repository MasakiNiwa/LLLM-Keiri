import { describe, expect, it } from 'vitest';
import type { UserContent } from '@/lib/db/db';
import { filterUserContent, userContentSnippet } from './userContentRepo';

const lesson = {
  id: 'my-a',
  kind: 'lesson',
  title: 'インボイスのきほん',
  createdAt: 1,
  data: {
    meta: { summary: '要約', tags: ['消費税'] },
    body: '適格請求書には登録番号を書きます。',
  },
} as unknown as UserContent;
const drill = {
  id: 'my-b',
  kind: 'drill',
  title: '給与の仕訳',
  createdAt: 2,
  data: {
    summary: '',
    tags: [],
    questions: [
      { question: '源泉所得税を差し引いた', answer: '給料 1 / 普通預金 1', explanation: '' },
    ],
  },
} as unknown as UserContent;

describe('マイ教材の検索', () => {
  it('タイトル・本文・問題文を探す（全角・半角を区別しない）', () => {
    expect(filterUserContent([lesson, drill], '登録番号')).toEqual([lesson]);
    expect(filterUserContent([lesson, drill], '源泉')).toEqual([drill]);
    expect(filterUserContent([lesson, drill], '')).toHaveLength(2);
    expect(filterUserContent([lesson, drill], '消費税 登録')).toEqual([lesson]);
  });
  it('検索語のまわりを抜き出す', () => {
    expect(userContentSnippet(lesson, '登録番号')).toContain('登録番号');
  });
});
