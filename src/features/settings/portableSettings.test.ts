import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, portableSettings } from './settingsStore';

describe('バックアップに含める設定', () => {
  it('クラウド AI の接続先・モデル・同意は含めない（端末ごと）', () => {
    const s = portableSettings({
      ...DEFAULT_SETTINGS,
      aiProvider: 'gemini',
      cloudModels: { gemini: 'gemini-2.5-flash' },
      cloudConsents: { gemini: true },
    } as unknown as Record<string, unknown>);
    expect(s.aiProvider).toBeUndefined();
    expect(s.cloudModels).toBeUndefined();
    expect(s.cloudConsents).toBeUndefined();
    expect(s.persona).toBe(DEFAULT_SETTINGS.persona);
  });
});
