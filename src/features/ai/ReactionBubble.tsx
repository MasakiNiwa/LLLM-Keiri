import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useEngine } from '@/features/engine/engineStore';
import { useSettings } from '@/features/settings/settingsStore';
import { buildAppState } from './appContext';
import { buildReactionPrompt } from './assist';
import { useAiBusy } from './aiBusy';
import type { AiFocus } from './focusStore';
import { runOneshot } from './oneshot';
import { getPersona, reactionText, type ReactionKey } from './personas';

interface ReactionBubbleProps {
  /** 変わるたびにひとことを出し直す（答え合わせの回数など） */
  trigger: number;
  reactionKey: ReactionKey;
  n?: number;
  /** AI が考えるときに渡す、見ている内容（採点結果を含む） */
  focus?: AiFocus;
  className?: string;
}

/**
 * 性格に合わせたひとこと。まずテンプレートをすぐ出し（モデル不要）、
 * 設定が「AI が考える」でモデルが使えれば、AI のひとことに差し替える。
 * ひとことは後回しにしてよい生成なので、ほかの生成を頼まれたら止めて譲る（oneshot.ts）。
 */
export function ReactionBubble({ trigger, reactionKey, n, focus, className }: ReactionBubbleProps) {
  const mode = useSettings((s) => s.reaction);
  const personaId = useSettings((s) => s.persona);
  const custom = useSettings((s) => s.customPersona);
  const persona = getPersona(personaId, custom);
  const [shown, setShown] = useState<{ trigger: number; text: string; ai: boolean } | null>(null);

  useEffect(() => {
    if (mode === 'off' || trigger === 0) return;
    let stale = false;
    const template = reactionText(getPersona(personaId, custom), reactionKey, n);
    // テンプレートは描画のあとに出す（effect の中で同期的に state を変えない）
    queueMicrotask(() => !stale && setShown({ trigger, text: template, ai: false }));
    const canAi =
      mode === 'llm' &&
      focus &&
      useEngine.getState().status === 'ready' &&
      useAiBusy.getState().task === null;
    if (canAi) {
      void (async () => {
        try {
          const state = await buildAppState(focus);
          if (stale) return;
          const r = await runOneshot({
            task: 'reaction',
            prompt: buildReactionPrompt(state),
            maxOutputTokens: 96,
          });
          if (!stale && !r.cancelled && r.text) setShown({ trigger, text: r.text, ai: true });
        } catch {
          // ひとことは出せなくてもよい（テンプレートのまま）
        }
      })();
    }
    return () => {
      stale = true;
    };
    // focus は答え合わせのときの内容を使う（trigger が変わったときだけ出し直す）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  if (mode === 'off' || !shown || shown.trigger !== trigger) return null;
  return (
    <div className={cn('flex items-start gap-2 animate-fade-in', className)} aria-live="polite">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        {persona.emoji}
      </span>
      <p className="rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {shown.text}
      </p>
    </div>
  );
}
