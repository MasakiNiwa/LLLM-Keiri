import { describe, expect, it } from 'vitest';
import { assistActions, buildAssistPrompt } from './assist';
import type { AiFocus } from './focusStore';

const drill = (patch: Partial<Extract<AiFocus, { kind: 'drill' }>>): AiFocus => ({
  kind: 'drill',
  setId: 's',
  setTitle: 'S',
  questionId: 'q1',
  question: 'Q',
  position: '1/10',
  revealed: false,
  ...patch,
});

describe('assistActions', () => {
  it('答えを見るまでは、答えを言わない頼み方だけを出す', () => {
    const before = assistActions(drill({}));
    expect(before.map((a) => a.id)).toEqual(['hint', 'think']);
    expect(before.every((a) => /言わ(ない|ずに)/.test(a.instruction))).toBe(true);
    const wrong = assistActions(
      drill({ judge: { kind: 'account', correct: false, messages: [] } }),
    );
    expect(wrong.map((a) => a.id)).toEqual(['mistake', 'hint']);
    expect(assistActions(drill({ revealed: true })).map((a) => a.id)).toContain('why');
  });

  it('プロンプトにアプリの状態と頼み方（または質問）を入れる', () => {
    const p = buildAssistPrompt({ now: 'n', viewing: { kind: 'home' } }, '頼み方', '');
    expect(p).toContain('<app_state>');
    expect(p).toContain('頼み方');
    expect(buildAssistPrompt({ now: 'n', viewing: { kind: 'home' } }, '頼み方', '質問')).toContain(
      'ユーザーの質問: 質問',
    );
  });
});
