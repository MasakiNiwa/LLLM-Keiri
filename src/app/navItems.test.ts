import { describe, expect, it } from 'vitest';
import { activeBottomItem, ALL_FEATURES, BOTTOM_NAV_ITEMS } from './navItems';

describe('下部ナビ', () => {
  it('7 つまで', () => {
    expect(BOTTOM_NAV_ITEMS.length).toBeLessThanOrEqual(7);
    expect(BOTTOM_NAV_ITEMS.map((i) => i.to)).toContain('/settings');
    expect(BOTTOM_NAV_ITEMS.map((i) => i.to)).toContain('/ai');
  });
  it('選択中の項目', () => {
    expect(activeBottomItem('/')).toBe('/');
    expect(activeBottomItem('/quiz/finance-cash')).toBe('/drill');
    expect(activeBottomItem('/chat')).toBe('/ai');
    expect(activeBottomItem('/studio/mine')).toBe('/ai');
    expect(activeBottomItem('/models')).toBe('/ai');
    expect(activeBottomItem('/settings')).toBe('/settings');
    expect(activeBottomItem('/ledger')).toBe('/menu');
    expect(activeBottomItem('/history/quiz%3Aa')).toBe('/log');
  });
  it('機能の行き先は重ならない', () => {
    const to = ALL_FEATURES.map((i) => i.to);
    expect(new Set(to).size).toBe(to.length);
  });
});
