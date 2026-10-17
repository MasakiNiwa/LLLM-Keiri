import { describe, expect, it } from 'vitest';
import { remarkCallouts, remarkCjkNewlines, remarkHeadingIds } from './remarkPlugins';

/* eslint-disable @typescript-eslint/no-explicit-any */
describe('remark プラグイン', () => {
  it('囲みの印を取り除いて data-callout を付ける', () => {
    const tree: any = {
      type: 'root',
      children: [
        {
          type: 'blockquote',
          children: [{ type: 'paragraph', children: [{ type: 'text', value: '[!POINT]\n本文' }] }],
        },
      ],
    };
    remarkCallouts()(tree);
    expect(tree.children[0].data.hProperties['data-callout']).toBe('point');
    expect(tree.children[0].children[0].children[0].value).toBe('本文');
  });

  it('h2・h3 に順番の id を付ける', () => {
    const tree: any = {
      type: 'root',
      children: [
        { type: 'heading', depth: 2, children: [] },
        { type: 'heading', depth: 4, children: [] },
        { type: 'heading', depth: 3, children: [] },
      ],
    };
    remarkHeadingIds()(tree);
    expect(tree.children[0].data.hProperties.id).toBe('sec-1');
    expect(tree.children[1].data).toBeUndefined();
    expect(tree.children[2].data.hProperties.id).toBe('sec-2');
  });

  it('日本語のあいだの改行だけを取り除く', () => {
    const tree: any = { type: 'text', value: 'です。\n次の文\nAI\nは\nok\nfine' };
    remarkCjkNewlines()(tree);
    expect(tree.value).toBe('です。次の文AIはok\nfine');
  });
});
