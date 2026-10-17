import { describe, expect, it } from 'vitest';
import { isAppKey } from './clearData';

describe('isAppKey', () => {
  it('このアプリの接頭辞の付いたキーだけを対象にする', () => {
    expect(isAppKey('lllm-keiri')).toBe(true);
    expect(isAppKey('lllm-keiri:settings')).toBe(true);
    expect(isAppKey('lllm-keiri-cache')).toBe(true);
    expect(isAppKey('lllm-study:settings')).toBe(false);
    expect(isAppKey('try-local:settings')).toBe(false);
    expect(isAppKey('lllm-keiriX')).toBe(false);
  });
});
