import { describe, expect, it } from 'vitest';
import { judgeJournal } from './judge';
import { parseShiwake } from './parse';
import type { JournalLine } from './types';

const lines = (text: string): JournalLine[] => parseShiwake(text).entries[0]?.lines ?? [];

describe('judgeJournal', () => {
  const expected = lines('仕入 100,000 / 買掛金 110,000\n仮払消費税等 10,000 /');

  it('行の順番・分け方が違っても、まとめて同じなら正解', () => {
    const r = judgeJournal(
      expected,
      lines('仮払消費税等 10,000 / 買掛金 100,000\n仕入 100,000 / 買掛金 10,000'),
    );
    expect(r.correct).toBe(true);
    expect(r.kind).toBe('correct');
    expect(r.marks['dr:仕入']).toBe('ok');
  });

  it('別名は正式な科目名にそろえる', () => {
    const r = judgeJournal(lines('仕入 1 / 買掛金 1'), lines('仕入 1 / 買掛 1'), (n) =>
      n === '買掛' ? '買掛金' : n,
    );
    expect(r.correct).toBe(true);
  });

  it('借方と貸方が逆', () => {
    const r = judgeJournal(lines('仕入 100 / 買掛金 100'), lines('買掛金 100 / 仕入 100'));
    expect(r.kind).toBe('swapped');
    expect(r.messages[0]).toBe('借方と貸方が逆になっています');
    expect(r.messages[1]).toBe('「買掛金」は借方ではなく、貸方です');
  });

  it('貸借の不一致', () => {
    const r = judgeJournal(expected, lines('仕入 100,000 / 買掛金 110,000'));
    expect(r.kind).toBe('unbalanced');
    expect(r.balanced).toBe(false);
    expect(r.messages.some((m) => m.includes('借方に足りない科目が 1 つ'))).toBe(true);
  });

  it('科目違いと金額違い', () => {
    expect(judgeJournal(lines('仕入 100 / 買掛金 100'), lines('仕入 100 / 未払金 100')).kind).toBe(
      'account',
    );
    const r = judgeJournal(lines('仕入 100 / 買掛金 100'), lines('仕入 90 / 買掛金 90'));
    expect(r.kind).toBe('amount');
    expect(r.issues).toHaveLength(2);
  });

  it('何も入力していない', () => {
    expect(judgeJournal(expected, []).kind).toBe('empty');
  });
});

describe('accountChoices', () => {
  it('正解の科目を含み、間違えやすい科目を混ぜ、毎回同じ並びにする', async () => {
    const { AccountBook } = await import('../content/accounts');
    const { accountChoices } = await import('./choices');
    const mk = (
      name: string,
      element: 'asset' | 'liability' | 'expense',
      related: string[] = [],
    ) => ({
      name,
      kana: name,
      element,
      group: 'g',
      contra: false,
      aliases: [],
      description: 'd',
      examples: [],
      related,
      level: 1,
    });
    const book = new AccountBook([
      mk('仕入', 'expense'),
      mk('買掛金', 'liability'),
      mk('未払金', 'liability'),
      mk('売上', 'expense'),
      mk('現金', 'asset'),
      mk('給料', 'expense'),
    ]);
    const a = accountChoices(['仕入', '買掛金'], book, 'q1', 4);
    expect(a).toHaveLength(4);
    expect(a).toEqual(expect.arrayContaining(['仕入', '買掛金', '未払金', '売上']));
    expect(accountChoices(['仕入', '買掛金'], book, 'q1', 4)).toEqual(a);
  });
});
