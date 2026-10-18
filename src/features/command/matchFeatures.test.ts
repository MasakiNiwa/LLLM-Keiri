import { describe, expect, it } from 'vitest';
import { ALL_FEATURES } from '@/app/navItems';
import { matchFeatures } from './matchFeatures';

describe('機能の検索', () => {
  it('名前・キーワードで探せる', () => {
    expect(matchFeatures(ALL_FEATURES, '試算表').map((i) => i.to)).toContain('/ledger');
    expect(matchFeatures(ALL_FEATURES, '復元').map((i) => i.to)).toEqual(['/settings']);
    expect(matchFeatures(ALL_FEATURES, '連結')[0].to).toBe('/consolidation');
  });
  it('全角・半角を区別しない', () => {
    expect(matchFeatures(ALL_FEATURES, 'ＡＩ').length).toBeGreaterThan(0);
  });
});
