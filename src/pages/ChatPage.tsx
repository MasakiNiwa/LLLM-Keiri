import { useState } from 'react';
import { Eraser, LifeBuoy, Paperclip, Sparkles, X } from 'lucide-react';
import { Link } from 'wouter';
import { PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getPersona } from '@/features/ai/personas';
import { focusTitle, useAiFocus } from '@/features/ai/focusStore';
import { useChat } from '@/features/chat/chatStore';
import { Composer } from '@/features/chat/Composer';
import { MessageList } from '@/features/chat/MessageList';
import { LoadProgressCard } from '@/features/models/LoadProgressCard';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';
import { useEngine } from '@/features/engine/engineStore';
import { useSettings } from '@/features/settings/settingsStore';

const SUGGESTIONS = [
  '売掛金と未収入金の違いは？',
  '「商品 5 万円を掛けで仕入れた」の仕訳を確認して',
  '税込 11,000 円の消費税はいくら？',
  '私の学習の進み具合はどう？',
  '次は何を学ぶといい？',
];

/** 使い方モードの質問の例 */
const HELP_SUGGESTIONS = [
  'このサイトで何ができる？',
  '仕訳問題の答え方は？',
  '帳簿をクリアするには？',
  'AI モデルを入れるには？',
  'AI の性格を変えるには？',
];

const ATTACHED_SUGGESTIONS = ['もっとくわしく教えて', '具体例をもう 1 つ', '実務ではどうするの？'];

/** 「チャットで続ける」で添付した、見ていたもの */
function AttachedFocus() {
  const attached = useAiFocus((s) => s.attached);
  const attach = useAiFocus((s) => s.attach);
  if (!attached) return null;
  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-accent-50 px-3 py-2 text-xs text-accent-900 dark:bg-accent-900/30 dark:text-accent-100">
        <Paperclip className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{focusTitle(attached)} について</span>
        <button
          type="button"
          onClick={() => attach(null)}
          aria-label="添付をはずす"
          className="rounded-md p-0.5 hover:bg-accent-100 dark:hover:bg-accent-900/50"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const personaId = useSettings((s) => s.persona);
  const custom = useSettings((s) => s.customPersona);
  const ready = useEngine((s) => s.status === 'ready');
  const engineStatus = useEngine((s) => s.status);
  const attached = useAiFocus((s) => s.attached);
  const helpMode = useChat((s) => s.helpMode);
  const persona = getPersona(personaId, custom);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-white text-4xl shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          {persona.emoji}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{persona.name}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{persona.tagline}</p>
        </div>
        {ready ? (
          <div className="flex flex-wrap justify-center gap-2">
            {(helpMode ? HELP_SUGGESTIONS : attached ? ATTACHED_SUGGESTIONS : SUGGESTIONS).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onPick(s)}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  {s}
                </button>
              ),
            )}
          </div>
        ) : engineStatus === 'loading' ? (
          <div className="w-full text-left">
            <LoadProgressCard />
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
            <p>
              AI はこの端末のブラウザの中で動くローカル AI です。会話の内容は外部に送信されません。
            </p>
            <Link href="/models">
              <Button variant="primary">
                <Sparkles />
                AI モデルを読み込む
              </Button>
            </Link>
          </div>
        )}
        <p className="text-xs text-slate-400">
          性格は「設定」で変えられます。仕訳の検証や消費税の計算は、AI
          がアプリのプログラム（ツール）を使って答えます。
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const ready = useChat((s) => s.ready);
  const hasMessages = useChat((s) => s.messages.length > 0);
  const clear = useChat((s) => s.clear);
  const helpMode = useChat((s) => s.helpMode);
  const setHelpMode = useChat((s) => s.setHelpMode);
  const personaId = useSettings((s) => s.persona);
  const custom = useSettings((s) => s.customPersona);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState({ text: '', n: 0 });
  const persona = getPersona(personaId, custom);

  return (
    <>
      <PageHeader
        title={`AI · ${persona.name}`}
        meta={<ModelStatusChip className="max-w-36 md:hidden" />}
        hideTitleOnMobile
        actions={
          <>
            <Button
              variant={helpMode ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setHelpMode(!helpMode)}
              aria-pressed={helpMode}
              aria-label="アプリの使い方を聞く"
              title="アプリの使い方を聞く（ヘルプをもとに答えます）"
            >
              <LifeBuoy />
              <span className="sm:hidden">使い方</span>
              <span className="hidden sm:inline">使い方を聞く</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(true)}
              disabled={!hasMessages}
              aria-label="会話をクリア"
              title="会話をクリア"
            >
              <Eraser />
              <span className="hidden sm:inline">クリア</span>
            </Button>
          </>
        }
      />
      {!ready ? (
        <div className="flex-1" />
      ) : hasMessages ? (
        <MessageList emoji={persona.emoji} />
      ) : (
        <EmptyState onPick={(text) => setDraft((d) => ({ text, n: d.n + 1 }))} />
      )}
      <div className="shrink-0 space-y-1 pt-1">
        {helpMode && (
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-3 sm:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
              <LifeBuoy className="size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                使い方モード: アプリのヘルプから関係する部分を選んで、AI が答えます
              </span>
              <button
                type="button"
                onClick={() => setHelpMode(false)}
                aria-label="使い方モードをやめる"
                className="rounded-md p-0.5 hover:bg-sky-100 dark:hover:bg-sky-900/40"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}
        <AttachedFocus />
        <Composer key={draft.n} initialText={draft.text} />
      </div>
      <ConfirmDialog
        open={confirming}
        title="会話をクリアしますか？"
        description="AI との会話をすべて削除します。学習記録・帳簿・モデルはそのままです。"
        confirmLabel="クリア"
        danger
        onConfirm={() => void clear()}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
