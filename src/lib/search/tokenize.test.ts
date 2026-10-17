import { describe, expect, it } from 'vitest';
import { tokenize } from './tokenize';

describe('tokenize', () => {
  it('日本語は 2 文字ずつ、英数字は単語で区切る', () => {
    expect(tokenize('売掛金')).toEqual(['売掛', '掛金']);
    expect(tokenize('B/S と P/L')).toEqual(['b', 's', 'と', 'p', 'l']);
    expect(tokenize('消費税10%')).toEqual(['消費', '費税', '10']);
    expect(tokenize('ＡＢＣ　仕訳')).toEqual(['abc', '仕訳']);
  });
});
