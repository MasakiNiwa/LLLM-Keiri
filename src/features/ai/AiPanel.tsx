import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUp, MessageSquareShare, RotateCcw, Sparkles, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { errorMessage } from '@/lib/utils/format';
import { useChat } from '@/features/chat/chatStore';
import { useEngine } from '@/features/engine/engineStore';
import { LoadProgressCard } from '@/features/models/LoadProgressCard';
import { useSettings } from '@/features/settings/settingsStore';
import { buildAppState, formatAppState } from './appContext';
import { assistActions, buildAssistPrompt, type AssistAction } from './assist';
import { useAiBusy } from './aiBusy';
import { useAiPanel } from './aiPanelStore';
import { focusTitle, useAiFocus, type AiFocus } from './focusStore';
import { cancelAi, runOneshot } from './oneshot';
import { getPersona } from './personas';

const Markdown = lazy(() => import('@/features/chat/markdown/Markdown'));

/** AI のページ・モデル・設定・ヘルプでは、フロートの解説を出さない */
const HIDDEN_ON = /^\/(chat|models|settings|help)/;

interface Exchange {
  /** 画面に出す頼み方（ボタンの名前や質問） */
  label: string;
  /** チャットに引き継ぐときの、ユーザーの発話 */
  question: string;
  answer: string;
  status: 'streaming' | 'done' | 'cancelled' | 'error';
  error?: string;
  /** そのとき AI に渡したアプリの状態 */
  context: string;
  focus: AiFocus;
}

/**
 * 見ている内容を AI が解説するフロートのパネル。
 * スマホは画面の下側、PC は右下に浮かべ、本文を読みながら使えるようにする（モーダルにしない）。
 */
export function AiPanel() {
  const [location] = useLocation();
  // ページを移ったら閉じ、前のページでのやりとりも消す（見ているものが変わるので）
  useEffect(() => {
    useAiPanel.getState().setOpen(false);
  }, [location]);
  if (HIDDEN_ON.test(location)) return null;
  return <AiPanelBody key={location} />;
}

function AiPanelBody() {
  const open = useAiPanel((s) => s.open);
  const setOpen = useAiPanel((s) => s.setOpen);
  const focus = useAiFocus((s) => s.current);
  const ready = useEngine((s) => s.status === 'ready');
  const loading = useEngine((s) => s.status === 'loading');
  const busyTask = useAiBusy((s) => s.task);
  const personaId = useSettings((s) => s.persona);
  const custom = useSettings((s) => s.customPersona);
  const persona = getPersona(personaId, custom);
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [question, setQuestion] = useState('');
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streaming = exchange?.status === 'streaming';
  // ほかの AI の処理（チャット・解説）の最中は頼めない（ひとことは譲ってもらえる）
  const otherBusy = busyTask !== null && busyTask !== 'reaction' && !streaming;

  if (!open) return null;

  const ask = async (action: AssistAction | null, text?: string) => {
    if (!ready || otherBusy || streaming) return;
    const state = await buildAppState(focus);
    const label = action?.label ?? text ?? '';
    const prompt = buildAssistPrompt(state, action?.instruction ?? '', text);
    const ex: Exchange = {
      label,
      question: text?.trim() || label,
      answer: '',
      status: 'streaming',
      context: formatAppState(state),
      focus,
    };
    setExchange(ex);
    setQuestion('');
    try {
      const r = await runOneshot({
        task: 'assist',
        prompt,
        onText: (t) => setExchange((cur) => (cur ? { ...cur, answer: t } : cur)),
      });
      setExchange((cur) =>
        cur ? { ...cur, answer: r.text, status: r.cancelled ? 'cancelled' : 'done' } : cur,
      );
    } catch (e) {
      setExchange((cur) => (cur ? { ...cur, status: 'error', error: errorMessage(e) } : cur));
    }
  };

  /** やりとりをチャットの履歴に入れて、AI のページで続ける */
  const continueInChat = async () => {
    if (!exchange || !exchange.answer) return;
    try {
      await useChat.getState().importExchange(exchange.question, exchange.answer, exchange.context);
      useAiFocus.getState().attach(exchange.focus);
      setOpen(false);
      navigate('/chat');
    } catch (e) {
      toast.error(`チャットに移れませんでした: ${errorMessage(e)}`);
    }
  };

  const actions = assistActions(focus);

  return (
    <section
      aria-label="AI の解説"
      className={cn(
        'fixed z-30 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900',
        // スマホ: 下部ナビの上に、画面の下側いっぱい
        'inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] max-h-[62dvh]',
        // PC: 右下に浮かべる
        'md:inset-x-auto md:right-5 md:bottom-5 md:max-h-[72dvh] md:w-[26rem]',
        'animate-fade-in',
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <span className="text-xl" aria-hidden>
          {persona.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{persona.name}に聞く</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">
            {focusTitle(focus)}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="閉じる">
          <X />
        </Button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3 text-sm">
        {!ready ? (
          loading ? (
            <LoadProgressCard />
          ) : (
            <div className="space-y-2 text-slate-600 dark:text-slate-400">
              <p>
                AI の解説を使うには、AI
                モデルを読み込みます（この端末のブラウザの中で動き、内容は外部に送信されません）。
              </p>
              <Link
                href="/models"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-accent-600 px-3 font-medium text-white hover:bg-accent-700"
              >
                <Sparkles className="size-4" />
                AI モデルを読み込む
              </Link>
            </div>
          )
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  disabled={streaming || otherBusy}
                  onClick={() => void ask(a)}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-sm hover:border-accent-400 hover:bg-accent-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  {a.label}
                </button>
              ))}
            </div>
            {otherBusy && (
              <p className="text-xs text-slate-500">
                AI が別の応答を生成中です。少し待ってください。
              </p>
            )}
            {exchange && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-accent-700 dark:text-accent-300">
                  {exchange.label}
                </p>
                <div className="prose-chat">
                  {exchange.answer ? (
                    <Suspense fallback={<p className="whitespace-pre-wrap">{exchange.answer}</p>}>
                      <Markdown text={exchange.answer} />
                    </Suspense>
                  ) : streaming ? (
                    <p className="animate-pulse text-slate-500">考えています…</p>
                  ) : null}
                </div>
                {exchange.status === 'error' && (
                  <p className="text-rose-600 dark:text-rose-400">{exchange.error}</p>
                )}
                {exchange.status === 'cancelled' && (
                  <p className="text-xs text-slate-400">（停止しました）</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {streaming ? (
                    <Button size="sm" onClick={cancelAi}>
                      <Square />
                      止める
                    </Button>
                  ) : (
                    <>
                      {exchange.answer && (
                        <Button size="sm" variant="primary" onClick={() => void continueInChat()}>
                          <MessageSquareShare />
                          チャットで続ける
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const a = actions.find((x) => x.label === exchange.label);
                          void ask(a ?? null, a ? undefined : exchange.question);
                        }}
                      >
                        <RotateCcw />
                        もう一度
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {ready && (
        <form
          className="flex shrink-0 items-end gap-2 border-t border-slate-200 p-2 dark:border-slate-800"
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) void ask(null, question);
          }}
        >
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (question.trim()) void ask(null, question);
              }
            }}
            rows={1}
            placeholder="この内容について質問する"
            className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-[16px] sm:text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <Button
            type="submit"
            variant="primary"
            size="icon"
            disabled={!question.trim() || streaming || otherBusy}
            aria-label="質問する"
          >
            <ArrowUp />
          </Button>
        </form>
      )}
    </section>
  );
}

/** 画面の右下に浮かべる AI のボタン */
export function AiFab() {
  const open = useAiPanel((s) => s.open);
  const setOpen = useAiPanel((s) => s.setOpen);
  const show = useSettings((s) => s.showAiButton);
  const personaId = useSettings((s) => s.persona);
  const custom = useSettings((s) => s.customPersona);
  const [location] = useLocation();
  if (!show || open || HIDDEN_ON.test(location)) return null;
  const persona = getPersona(personaId, custom);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="AI に解説してもらう"
      title="AI に解説してもらう"
      className="fixed right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 flex h-12 items-center gap-1.5 rounded-full bg-accent-600 pr-4 pl-3 text-sm font-medium text-white shadow-lg hover:bg-accent-700 md:right-6 md:bottom-6"
    >
      <span className="text-lg" aria-hidden>
        {persona.emoji}
      </span>
      AI 解説
    </button>
  );
}
