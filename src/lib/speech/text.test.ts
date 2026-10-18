import { describe, expect, it } from 'vitest';
import { speechText } from './text';

describe('読み上げ用の文', () => {
  it('Markdown の記号とコードブロックを落とす', () => {
    const t = speechText(
      '## 見出し\n\n**売掛金**は[資産](#/x)です。\n\n```shiwake\n売掛金 1 / 売上 1\n```\n- 箇条書き',
    );
    expect(t).toBe('見出し\n売掛金は資産です。\n箇条書き');
  });
  it('△ と ＝ を読める形にする', () => {
    expect(speechText('利益 ＝ △100')).toBe('利益 イコール マイナス100');
  });
});
