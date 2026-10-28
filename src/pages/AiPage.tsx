import { useState } from 'react';
import { ChevronRight, Play } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { CHAT_ITEM, MODELS_ITEM, STUDIO_ITEM, type NavItem } from '@/app/navItems';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AI_PRACTICES, type AiPractice } from '@/features/ai/practices';
import { useFocus } from '@/features/ai/useFocus';
import { useChat } from '@/features/chat/chatStore';
import { cn } from '@/lib/utils/cn';
import { useAiReady } from '@/features/cloud/aiClient';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';

function LinkCard({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.to} className="group">
      <Card className="flex h-full items-center gap-3 p-3.5 transition-colors group-hover:border-accent-300 dark:group-hover:border-accent-700">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{item.label}</span>
          <span className="block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {item.description}
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-slate-400" />
      </Card>
    </Link>
  );
}

function PracticeCard({
  p,
  disabled,
  onStart,
}: {
  p: AiPractice;
  disabled: boolean;
  onStart: (p: AiPractice, theme: string) => void;
}) {
  const [theme, setTheme] = useState(p.themes[0]);
  return (
    <Card className="flex flex-col gap-2 p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl dark:bg-slate-800">
          {p.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{p.title}</span>
          <span className="block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {p.description}
          </span>
        </span>
      </div>
      <div className="space-y-1.5">
        <span className="block text-xs text-slate-600 dark:text-slate-400">
          テーマ（押して選ぶか、下の欄に書く）
        </span>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="テーマの候補">
          {p.themes.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={theme === t}
              onClick={() => setTheme(t)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                theme === t
                  ? 'border-accent-600 bg-accent-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-accent-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          aria-label={`${p.title}のテーマ`}
          placeholder="自由にテーマを書く"
          className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      <Button
        variant="primary"
        size="sm"
        disabled={disabled || !theme.trim()}
        onClick={() => onStart(p, theme.trim())}
        className="self-end"
      >
        <Play />
        はじめる
      </Button>
    </Card>
  );
}

/** AI の入口: AI に質問・AI 練習・外部 AI・モデル */
export default function AiPage() {
  useFocus({ kind: 'other', page: 'AI（AI に質問・AI 練習）' });
  const [, navigate] = useLocation();
  const ready = useAiReady();
  const [pending, setPending] = useState<{ p: AiPractice; theme: string } | null>(null);

  const start = async (p: AiPractice, theme: string, clearFirst: boolean) => {
    const chat = useChat.getState();
    await chat.init();
    if (clearFirst) await chat.clear();
    chat.setHelpMode(false);
    if (chat.send(p.message(theme), { label: p.title, instructions: p.instructions(theme) }))
      navigate(CHAT_ITEM.to);
  };

  const onStart = async (p: AiPractice, theme: string) => {
    await useChat.getState().init();
    if (useChat.getState().messages.length > 0) setPending({ p, theme });
    else void start(p, theme, false);
  };

  return (
    <>
      <PageHeader title="AI" meta={<ModelStatusChip className="max-w-44" />} />
      <PageBody>
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            AI に質問
          </h2>
          <LinkCard item={CHAT_ITEM} />
          <p className="px-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            レッスン・問題・帳簿の画面では、右下の「AI 解説」から、見ている内容について AI
            に聞けます。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            AI 練習（AI が役になって相手をします）
          </h2>
          {!ready && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              AI 練習には AI が必要です。
              <Link href={MODELS_ITEM.to} className="font-medium underline">
                「AI モデル」
              </Link>
              でモデルを読み込むか、クラウド AI のキーを登録・解除してください。
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {AI_PRACTICES.map((p) => (
              <PracticeCard
                key={p.id}
                p={p}
                disabled={!ready}
                onStart={(x, t) => void onStart(x, t)}
              />
            ))}
          </div>
          <p className="px-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            練習はチャットで進みます。やめるときは「練習をやめる」と送ってください。AI
            の答えには誤りがあり得るので、数字と制度はレッスンや一次情報で確かめてください。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            ほかの AI の機能
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <LinkCard item={STUDIO_ITEM} />
            <LinkCard item={MODELS_ITEM} />
          </div>
        </section>
      </PageBody>
      <ConfirmDialog
        open={pending !== null}
        title="新しい会話で練習を始めますか？"
        description="いまの AI との会話を削除してから、練習を始めます。"
        confirmLabel="はじめる"
        onConfirm={() => {
          if (pending) void start(pending.p, pending.theme, true);
        }}
        onClose={() => setPending(null)}
      />
    </>
  );
}
