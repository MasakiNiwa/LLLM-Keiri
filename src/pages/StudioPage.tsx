import { useMemo, useRef, useState } from 'react';
import {
  BookOpenText,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileUp,
  FolderHeart,
  Import,
  MessageCircleQuestion,
  Network,
  PenLine,
  Trash2,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link, useLocation, useParams } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { buildAppState, formatAppState } from '@/features/ai/appContext';
import { focusTitle, useAiFocus } from '@/features/ai/focusStore';
import { useContentIndex } from '@/features/content/contentStore';
import { LEVEL_LABELS } from '@/features/learn/meta';
import { parseImport, type ImportResult } from '@/features/studio/importContent';
import { buildAskPrompt, buildMakePrompt, type MakeOptions } from '@/features/studio/prompts';
import {
  deleteUserContent,
  exportUserContent,
  saveUserContent,
  userContentHref,
  useUserContent,
} from '@/features/studio/userContentRepo';
import type { ContentIndex } from '@/lib/content/schema';
import type { UserContent } from '@/lib/db/db';
import { copyText, downloadText } from '@/lib/utils/download';
import { errorMessage } from '@/lib/utils/format';

type Tab = 'make' | 'import' | 'mine' | 'ask';
const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'make', label: '作る', icon: <Wand2 /> },
  { value: 'import', label: '取り込む', icon: <Import /> },
  { value: 'mine', label: 'マイ教材', icon: <FolderHeart /> },
  { value: 'ask', label: '質問する', icon: <MessageCircleQuestion /> },
];

/** 外部の AI サービス（プロンプトを貼り付ける先の例） */
const EXTERNAL_AIS = [
  { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  { name: 'Claude', url: 'https://claude.ai/' },
  { name: 'Gemini', url: 'https://gemini.google.com/' },
];

const textarea =
  'w-full rounded-xl border border-slate-300 bg-white p-3 text-[16px] sm:text-sm dark:border-slate-700 dark:bg-slate-950';

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-3 p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <span className="flex size-6 items-center justify-center rounded-full bg-accent-600 text-xs text-white">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

function ExternalLinks() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-slate-500">貼り付け先の例:</span>
      {EXTERNAL_AIS.map((a) => (
        <a
          key={a.name}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-accent-700 hover:underline dark:text-accent-300"
        >
          {a.name}
          <ExternalLink className="size-3.5" />
        </a>
      ))}
    </div>
  );
}

async function copy(text: string) {
  if (await copyText(text))
    toast.success('プロンプトをコピーしました', { description: '外部の AI に貼り付けてください' });
  else toast.error('コピーできませんでした。下の欄から手で選んでコピーしてください');
}

// ---------------- 作る ----------------

function MakeTab({ index, onNext }: { index: ContentIndex; onNext: () => void }) {
  const [o, setO] = useState<MakeOptions>({
    kind: 'drill',
    topic: '',
    track: 'trade',
    level: 1,
    count: 10,
    notes: '',
  });
  const prompt = useMemo(() => buildMakePrompt(o, index), [o, index]);
  const set = (patch: Partial<MakeOptions>) => setO({ ...o, ...patch });
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        ローカル AI では作るのが難しい教材を、外部の高性能な AI
        に作ってもらいます。条件を決めてプロンプトをコピーし、外部の AI
        に貼り付けて、返ってきた内容を「取り込む」に貼り付けます。形式の説明と使える勘定科目もプロンプトに入っています。
      </p>
      <Step n={1} title="作るものを決める">
        <div className="flex flex-wrap gap-2">
          <Chip active={o.kind === 'drill'} onClick={() => set({ kind: 'drill' })}>
            <PenLine className="mr-1 inline size-4" />
            仕訳問題のセット
          </Chip>
          <Chip active={o.kind === 'lesson'} onClick={() => set({ kind: 'lesson' })}>
            <BookOpenText className="mr-1 inline size-4" />
            レッスン
          </Chip>
          <Chip
            active={o.kind === 'consolidation'}
            onClick={() => set({ kind: 'consolidation', track: 'consolidation', level: 4 })}
          >
            <Network className="mr-1 inline size-4" />
            連結の事例
          </Chip>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">テーマ</span>
          <input
            value={o.topic}
            onChange={(e) => set({ topic: e.target.value })}
            placeholder="例: 手形の取引、減価償却（定額法）、インボイス制度"
            className={`${textarea} h-11 py-0`}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">分野</span>
            <Select
              value={o.track}
              onChange={(v) => set({ track: v })}
              options={index.tracks.map((t) => ({ value: t.id, label: t.title }))}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">レベル</span>
            <Select
              value={String(o.level)}
              onChange={(v) => set({ level: Number(v) })}
              options={[1, 2, 3, 4, 5].map((n) => ({
                value: String(n),
                label: `${n}: ${LEVEL_LABELS[n]}`,
              }))}
            />
          </label>
          {o.kind === 'drill' && (
            <label className="space-y-1 text-sm">
              <span className="font-medium">問題数</span>
              <Select
                value={String(o.count)}
                onChange={(v) => set({ count: Number(v) })}
                options={[5, 10, 15, 20].map((n) => ({ value: String(n), label: `${n} 問` }))}
              />
            </label>
          )}
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">そのほかの要望（任意）</span>
          <textarea
            value={o.notes}
            onChange={(e) => set({ notes: e.target.value })}
            rows={2}
            placeholder="例: 飲食店の取引を例にして、消費税は税抜経理で"
            className={textarea}
          />
        </label>
      </Step>
      <Step n={2} title="プロンプトをコピーして、外部の AI に貼り付ける">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void copy(prompt)}>
            <ClipboardCopy />
            プロンプトをコピー
          </Button>
        </div>
        <ExternalLinks />
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500">
            プロンプトを見る（{prompt.length.toLocaleString()} 字）
          </summary>
          <textarea
            readOnly
            value={prompt}
            rows={10}
            className={`${textarea} mt-2 font-mono text-xs`}
          />
        </details>
      </Step>
      <Step n={3} title="返ってきた内容を取り込む">
        <Button onClick={onNext}>
          <Import />
          「取り込む」へ
        </Button>
      </Step>
    </div>
  );
}

// ---------------- 取り込む ----------------

function ImportTab({ index, onDone }: { index: ContentIndex; onDone: () => void }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const check = (t = text) => setResult(parseImport(t, index));
  const save = async () => {
    const r = parseImport(text, index);
    setResult(r);
    if (!r.content) return;
    try {
      const replaced = await saveUserContent(r.content);
      toast.success(replaced ? 'マイ教材を置き換えました' : 'マイ教材に追加しました');
      setText('');
      setResult(null);
      onDone();
    } catch (e) {
      toast.error(`保存できませんでした: ${errorMessage(e)}`);
    }
  };
  const c = result?.content;
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          外部の AI の返答（レッスンの Markdown・問題セットの
          JSON）を貼り付けるか、ファイルを選びます。前後の説明やコードブロックの囲みはそのままで大丈夫です。取り込む前に、形式・仕訳の貸借・勘定科目をプログラムで確かめます。
        </p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          rows={10}
          placeholder="ここに貼り付け"
          aria-label="取り込む内容"
          className={`${textarea} font-mono text-xs`}
        />
        <input
          ref={fileRef}
          type="file"
          accept=".md,.json,.yaml,.yml,.txt,text/*,application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            const t = await f.text();
            setText(t);
            check(t);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void save()} disabled={!text.trim()}>
            <Import />
            確かめて取り込む
          </Button>
          <Button onClick={() => check()} disabled={!text.trim()}>
            確かめるだけ
          </Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            <FileUp />
            ファイルを選ぶ
          </Button>
          {text && (
            <Button
              variant="ghost"
              onClick={() => {
                setText('');
                setResult(null);
              }}
            >
              クリア
            </Button>
          )}
        </div>
      </Card>
      {result && result.errors.length > 0 && (
        <Card className="border-rose-200 p-4 text-sm dark:border-rose-900">
          <p className="mb-1 font-semibold text-rose-700 dark:text-rose-300">
            {result.errors.length} 件の問題があり、取り込めません
          </p>
          <ul className="list-disc space-y-0.5 pl-5 text-rose-700 dark:text-rose-300">
            {result.errors.slice(0, 20).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            外部の AI に、このエラーをそのまま伝えて直してもらうのがおすすめです。
          </p>
          <Button
            size="sm"
            className="mt-2"
            onClick={() =>
              void copy(
                `次のエラーを直して、同じ形式で全体をもう一度出力してください。\n\n${result.errors.map((e) => `- ${e}`).join('\n')}`,
              )
            }
          >
            <ClipboardCopy />
            直してもらうプロンプトをコピー
          </Button>
        </Card>
      )}
      {c && (
        <Card className="p-4 text-sm">
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">
            ✓ 取り込めます:{' '}
            {c.kind === 'lesson'
              ? `レッスン「${c.lesson.meta.title}」`
              : c.kind === 'drill'
                ? `問題セット「${c.drill.title}」（${c.drill.questions.length} 問）`
                : `連結の事例「${c.consolidation.title}」（${c.consolidation.entities.length} 社・修正仕訳 ${c.consolidation.eliminations.length}）`}
          </p>
          {result?.notes.map((n) => (
            <p key={n} className="mt-1 text-xs text-slate-500">
              {n}
            </p>
          ))}
        </Card>
      )}
    </div>
  );
}

// ---------------- マイ教材 ----------------

function MineTab() {
  const items = useUserContent();
  const [deleting, setDeleting] = useState<UserContent | null>(null);
  if (!items) return null;
  if (items.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
        まだマイ教材はありません。「作る」でプロンプトを作り、外部の AI
        の返答を「取り込む」で追加できます。
      </Card>
    );
  }
  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        取り込んだ教材は、この端末のブラウザに保存されます。「学ぶ」「練習」の一覧にも「マイ教材」として表示されます。
      </p>
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            {c.kind === 'lesson' ? (
              <BookOpenText className="size-5 shrink-0 text-accent-600" />
            ) : c.kind === 'drill' ? (
              <PenLine className="size-5 shrink-0 text-accent-600" />
            ) : (
              <Network className="size-5 shrink-0 text-accent-600" />
            )}
            <Link href={userContentHref(c)} className="min-w-0 flex-1 hover:underline">
              <span className="block truncate font-medium">{c.title}</span>
              <span className="block text-xs text-slate-500">
                {c.kind === 'lesson'
                  ? 'レッスン'
                  : c.kind === 'drill'
                    ? `問題セット・${c.data.questions.length} 問`
                    : `連結の事例・${c.data.entities.length} 社`}{' '}
                ・ {new Date(c.createdAt).toLocaleDateString('ja-JP')}
              </span>
            </Link>
            <button
              type="button"
              aria-label="ファイルに書き出す"
              title="ファイルに書き出す"
              onClick={() => {
                const f = exportUserContent(c);
                downloadText(f.name, f.text, f.type);
              }}
              className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
            >
              <Download className="size-4" />
            </button>
            <button
              type="button"
              aria-label="消す"
              title="消す"
              onClick={() => setDeleting(c)}
              className="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-800"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </Card>
      <ConfirmDialog
        open={!!deleting}
        title="このマイ教材を消しますか？"
        description={deleting?.title}
        confirmLabel="消す"
        danger
        onConfirm={() => deleting && void deleteUserContent(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

// ---------------- 質問する ----------------

function AskTab() {
  const [question, setQuestion] = useState('');
  const current = useAiFocus((s) => s.current);
  const attached = useAiFocus((s) => s.attached);
  const focus = attached ?? current;
  const makePrompt = async () => {
    const state = await buildAppState(focus);
    await copy(buildAskPrompt(question, formatAppState(state)));
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        ローカル AI では答えにくい質問（最新の制度・込み入った論点など）を、外部の高性能な AI
        に聞くためのプロンプトを作ります。直前に見ていた画面の内容（構造化データ）を添えるので、状況を説明し直す必要がありません。
      </p>
      <Card className="space-y-3 p-4">
        <p className="text-sm">
          添える内容: <strong>{focusTitle(focus)}</strong>
        </p>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={4}
          placeholder="例: この取引で、インボイスがない場合の仕入税額控除はどうなりますか？"
          aria-label="質問"
          className={textarea}
        />
        <Button variant="primary" disabled={!question.trim()} onClick={() => void makePrompt()}>
          <ClipboardCopy />
          プロンプトをコピー
        </Button>
        <ExternalLinks />
        <p className="text-xs text-slate-500">
          ⚠️ 外部の AI
          に貼り付けた内容は、そのサービスに送信されます。個人情報や会社の機密は入れないでください。
        </p>
      </Card>
    </div>
  );
}

export default function StudioPage() {
  const params = useParams<{ tab?: string }>();
  const [, navigate] = useLocation();
  const tab: Tab = TABS.some((t) => t.value === params.tab) ? (params.tab as Tab) : 'make';
  const { index, error } = useContentIndex();
  const go = (t: Tab) => navigate(t === 'make' ? '/studio' : `/studio/${t}`, { replace: true });
  return (
    <>
      <PageHeader title="外部 AI と連携" />
      <PageBody>
        <Tabs value={tab} items={TABS} onChange={go} />
        {error && <p className="text-sm text-rose-600">読み込めませんでした: {error}</p>}
        {index && tab === 'make' && <MakeTab index={index} onNext={() => go('import')} />}
        {index && tab === 'import' && <ImportTab index={index} onDone={() => go('mine')} />}
        {tab === 'mine' && <MineTab />}
        {tab === 'ask' && <AskTab />}
      </PageBody>
    </>
  );
}
