import { describe, expect, it } from 'vitest';
import type { ContentIndex } from '@/lib/content/schema';
import { extractPayload, parseImport } from './importContent';

const acc = (name: string, element: 'asset' | 'liability' | 'expense') => ({
  name,
  kana: name,
  element,
  group: 'g',
  contra: false,
  aliases: [],
  description: 'd',
  examples: [],
  related: [],
  level: 1,
});

const index: ContentIndex = {
  version: 1,
  tracks: [
    { id: 'basics', title: 'きほん', description: 'd' },
    { id: 'tax', title: '税金', description: 'd' },
  ],
  lessons: [],
  drills: [],
  accounts: [acc('仕入', 'expense'), acc('買掛金', 'liability'), acc('現金', 'asset')],
  rules: [],
  scenarios: [],
  consolidations: [],
};

const lesson = `---
id: invoice
title: T
track: tax
order: 1
level: 2
summary: S
asOf: '2026-10-01'
updated: '2026-10-01'
---

## A

\`\`\`shiwake
仕入 100 / 買掛金 100
\`\`\`
`;

describe('extractPayload', () => {
  it('前後の説明やコードブロックを取り除く', () => {
    expect(extractPayload('はい、作りました。\n```json\n{"a":1}\n```\nどうぞ')).toBe('{"a":1}');
    expect(extractPayload('```markdown\n' + lesson + '```')).toBe(lesson.trim());
  });
});

describe('parseImport', () => {
  it('レッスンを読み、id に my- を付ける', () => {
    const r = parseImport(lesson, index);
    expect(r.errors).toEqual([]);
    expect(r.content?.kind).toBe('lesson');
    if (r.content?.kind === 'lesson') expect(r.content.lesson.meta.id).toBe('my-invoice');
    expect(r.notes[0]).toContain('my-invoice');
  });

  it('問題セットを読み、仕訳の誤りを知らせる', () => {
    const drill = {
      id: 'my-d',
      title: 'D',
      track: 'unknown',
      order: 1,
      level: 1,
      summary: 'S',
      asOf: '2026-10-01',
      updated: '2026-10-01',
      questions: [{ id: 'q1', question: 'Q', answer: '仕入 100 / 買掛金 100' }],
    };
    const ok = parseImport(JSON.stringify(drill), index);
    expect(ok.errors).toEqual([]);
    if (ok.content?.kind === 'drill') expect(ok.content.drill.track).toBe('basics');
    const bad = parseImport(
      JSON.stringify({
        ...drill,
        questions: [{ id: 'q1', question: 'Q', answer: '仕入 100 / 売掛金 90' }],
      }),
      index,
    );
    expect(bad.errors.some((e) => e.includes('貸借が一致していません'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('「売掛金」'))).toBe(true);
  });

  it('連結の事例を読み、試算表の貸借を確かめる', () => {
    const c = {
      id: 'cons',
      title: 'C',
      summary: 'S',
      level: 4,
      asOf: '2026-10-01',
      updated: '2026-10-01',
      entities: [
        { id: 'p', name: 'P', role: 'parent', trialBalance: '現金 100 / 買掛金 100' },
        {
          id: 's',
          name: 'S',
          role: 'subsidiary',
          ownership: 100,
          trialBalance: '現金 50 / 買掛金 50',
        },
      ],
      eliminations: [
        {
          id: 'e1',
          category: 'balances',
          title: 'T',
          question: 'Q',
          shiwake: '買掛金 10 / 現金 10',
          explanation: 'E',
        },
      ],
    };
    const ok = parseImport(JSON.stringify(c), index);
    expect(ok.errors).toEqual([]);
    expect(ok.content?.kind).toBe('consolidation');
    const bad = parseImport(
      JSON.stringify({
        ...c,
        entities: [
          c.entities[0],
          { ...c.entities[1], ownership: undefined, trialBalance: '現金 50 / 買掛金 40' },
        ],
      }),
      index,
    );
    expect(bad.errors.some((e) => e.includes('ownership'))).toBe(true);
    expect(bad.errors.some((e) => e.includes('貸借が一致していません'))).toBe(true);
  });

  it('読めないものはエラー', () => {
    expect(parseImport('こんにちは', index).errors).toHaveLength(1);
  });
});
