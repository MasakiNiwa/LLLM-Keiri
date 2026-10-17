import { useState } from 'react';
import { Link } from 'wouter';
import { getPersona, greetingText } from '@/features/ai/personas';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';
import { useSettings } from '@/features/settings/settingsStore';

/** ホーム: AI のあいさつ（テンプレート。モデルがなくても出る） */
export function Greeting() {
  const personaId = useSettings((s) => s.persona);
  const custom = useSettings((s) => s.customPersona);
  const persona = getPersona(personaId, custom);
  const [text] = useState(() => greetingText(persona));
  return (
    <div className="flex items-start gap-2.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        {persona.emoji}
      </span>
      <div className="min-w-0 space-y-1.5">
        <p className="rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-sm shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          {text}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Link href="/settings" className="hover:underline">
            {persona.name}
          </Link>
          <ModelStatusChip />
        </div>
      </div>
    </div>
  );
}
