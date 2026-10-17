import { describe, expect, it } from 'vitest';
import { helpContext, searchHelp } from './helpTopics';

describe('searchHelp', () => {
  it('質問に関係する項目を選ぶ', () => {
    expect(searchHelp('帳簿をクリアするには？')[0].id).toBe('ledger');
    expect(searchHelp('AI モデルのダウンロード').map((t) => t.id)).toContain('ai-model');
  });
  it('関係する項目がなければ、そう伝える', () => {
    expect(helpContext('zzz')).toContain('見つかりませんでした');
  });
});
