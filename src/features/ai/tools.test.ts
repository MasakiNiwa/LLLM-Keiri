import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/content/load', () => ({
  fetchContentIndex: async () => ({
    accounts: [
      {
        name: '仕入',
        kana: 'しいれ',
        element: 'expense',
        group: '売上原価',
        contra: false,
        aliases: [],
        description: '商品の原価',
        examples: [],
        related: [],
        level: 1,
      },
      {
        name: '買掛金',
        kana: 'かいかけきん',
        element: 'liability',
        group: '流動負債',
        contra: false,
        aliases: ['買掛'],
        description: '後払いの義務',
        examples: [],
        related: [],
        level: 1,
      },
    ],
    rules: [
      {
        id: 'consumption-tax-standard',
        title: '標準税率',
        unit: 'percent',
        basis: [],
        values: [
          { from: '2014-04-01', to: '2019-09-30', value: 8 },
          { from: '2019-10-01', value: 10 },
        ],
      },
    ],
  }),
  fetchLesson: async () => {
    throw new Error('none');
  },
}));

const { executeTool } = await import('./tools');
const { sectionText } = await import('@/lib/content/sections');

describe('tools', () => {
  it('check_journal: 貸借の一致と、各行の増減の意味を返す', async () => {
    const r = (await executeTool({
      name: 'check_journal',
      arguments: { entry: '仕入 100 / 買掛 100' },
    })) as { ok: boolean; entries: { lines: { account: string; meaning: string }[] }[] };
    expect(r.ok).toBe(true);
    expect(r.entries[0].lines).toEqual([
      expect.objectContaining({ account: '仕入', meaning: '費用の増加' }),
      expect.objectContaining({ account: '買掛金', meaning: '負債の増加' }),
    ]);
    const bad = (await executeTool({
      name: 'check_journal',
      arguments: { entry: '仕入 100 / 未知 90' },
    })) as { ok: boolean };
    expect(bad.ok).toBe(false);
  });

  it('calc_consumption_tax: 日付で税率を選ぶ', async () => {
    expect(
      await executeTool({
        name: 'calc_consumption_tax',
        arguments: { amount: 1000, mode: 'excluded', date: '2019-09-30' },
      }),
    ).toMatchObject({ rate_percent: 8, tax: 80, gross: 1080 });
    expect(
      await executeTool({
        name: 'calc_consumption_tax',
        arguments: { amount: 1100, mode: 'included', date: '2026-04-01' },
      }),
    ).toMatchObject({ rate_percent: 10, tax: 100, net: 1000 });
  });

  it('lookup_account: 別名でも引ける', async () => {
    expect(
      await executeTool({ name: 'lookup_account', arguments: { name: '買掛' } }),
    ).toMatchObject({ name: '買掛金', increase_side: '貸方' });
  });

  it('sectionText: 見出しの節だけを取り出す', () => {
    const body = '## A\na\n```shiwake\n## not heading\n```\n### A2\nx\n## B\nb';
    expect(sectionText(body, 'A2')).toBe('### A2\nx');
    expect(sectionText(body, 'A')).toContain('### A2');
    expect(sectionText(body, 'A')).not.toContain('## B');
    expect(sectionText(body, 'Z')).toBeUndefined();
  });
});
