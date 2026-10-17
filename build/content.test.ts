import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildContent, extractHeadings } from './content';

let dirs: string[] = [];
afterEach(() => {
  dirs.forEach((d) => rmSync(d, { recursive: true, force: true }));
  dirs = [];
});

function makeRoot(lesson: string): string {
  const root = mkdtempSync(path.join(tmpdir(), 'keiri-content-'));
  dirs.push(root);
  const c = path.join(root, 'content');
  mkdirSync(path.join(c, 'lessons'), { recursive: true });
  writeFileSync(
    path.join(c, 'tracks.yaml'),
    '- id: basics\n  title: きほん\n  description: せつめい\n',
  );
  writeFileSync(
    path.join(c, 'accounts.yaml'),
    [
      '- { name: 現金, kana: げんきん, element: asset, group: 流動資産, description: お金 }',
      '- { name: 売上, kana: うりあげ, element: revenue, group: 売上高, description: 売上 }',
    ].join('\n'),
  );
  writeFileSync(path.join(c, 'lessons', 'a.md'), lesson);
  return root;
}

const FRONT = `---
id: a
title: A
track: basics
order: 1
level: 1
summary: S
asOf: '2026-10-01'
updated: '2026-10-01'
---
`;

describe('buildContent', () => {
  it('正しいデータから一覧とレッスンの JSON を作る', () => {
    const root = makeRoot(
      FRONT +
        '## 見出し\n\n```shiwake\n現金 100 / 売上 100\n```\n\n```quiz\ntype: choice\nquestion: Q\nchoices: [a, b]\nanswer: 0\n```\n',
    );
    const r = buildContent(root);
    expect(r.errors).toEqual([]);
    const index = JSON.parse(r.files.get('content/index.json')!);
    expect(index.lessons[0]).toMatchObject({ id: 'a', quizCount: 1 });
    const lesson = JSON.parse(r.files.get('content/lessons/a.json')!);
    expect(lesson.body).toContain('{"type":"choice"');
  });

  it('貸借の不一致・知らない科目・形式の誤りを見つける', () => {
    const root = makeRoot(
      FRONT +
        '```shiwake\n現金 100 / 売上 90\n売掛金 10 /\n```\n\n```quiz\ntype: choice\nquestion: Q\nchoices: [a, b]\nanswer: 5\n```\n',
    );
    const { errors } = buildContent(root);
    expect(errors.some((e) => e.includes('貸借が一致していません'))).toBe(true);
    expect(errors.some((e) => e.includes('「売掛金」が勘定科目の一覧にありません'))).toBe(true);
    expect(errors.some((e) => e.includes('answer が選択肢の数を超えています'))).toBe(true);
  });
});

describe('extractHeadings', () => {
  it('コードブロックの中の # は見出しにしない', () => {
    expect(extractHeadings('## A\n```shiwake\n# 説明\n```\n### B\n')).toEqual([
      { id: 'sec-1', depth: 2, text: 'A' },
      { id: 'sec-2', depth: 3, text: 'B' },
    ]);
  });
});
