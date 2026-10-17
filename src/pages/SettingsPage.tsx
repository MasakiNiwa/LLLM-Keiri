import { useEffect, useState } from 'react';
import {
  Bot,
  ChevronRight,
  Database,
  Gauge,
  HardDrive,
  Palette,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Section } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { PersonaPicker } from '@/features/ai/PersonaPicker';
import { CUSTOM_PERSONA_ID } from '@/features/ai/personas';
import { useEngine } from '@/features/engine/engineStore';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';
import { isOpfsSupported } from '@/lib/llm/modelStorage';
import {
  BACKEND_SETTING_LABELS,
  DARK_PALETTE_LABELS,
  REACTION_LABELS,
  THEME_LABELS,
  USER_ROLE_LABELS,
} from '@/features/settings/labels';
import {
  FONT_SCALES,
  useSettings,
  type BackendSetting,
  type DarkPalette,
  type ReactionMode,
  type UserRole,
  type FontScale,
  type ThemeSetting,
} from '@/features/settings/settingsStore';
import { db } from '@/lib/db/db';
import { clearAppData } from '@/lib/storage/clearData';
import { cn } from '@/lib/utils/cn';
import { errorMessage, formatBytes } from '@/lib/utils/format';

/** ダークモードの配色の見本（背景・カード・アクセント・文字） */
const SWATCHES: Record<DarkPalette, [string, string, string, string]> = {
  neutral: ['#212121', '#2f2f2f', '#4f7b77', '#ececec'],
  warm: ['#262624', '#33322f', '#a86a52', '#eeece6'],
  vivid: ['#020617', '#0f172a', '#0d9488', '#f1f5f9'],
};

function PaletteSwatch({ palette }: { palette: DarkPalette }) {
  const [bg, card, accent, text] = SWATCHES[palette];
  return (
    <span
      className="flex size-11 shrink-0 flex-col justify-center gap-1 rounded-lg p-1.5 ring-1 ring-slate-300 dark:ring-slate-600"
      style={{ background: bg }}
      aria-hidden
    >
      <span className="h-2 rounded-sm" style={{ background: card }} />
      <span className="h-1.5 w-2/3 rounded-sm" style={{ background: text }} />
      <span className="h-2 w-1/2 rounded-sm" style={{ background: accent }} />
    </span>
  );
}

function StorageUsage() {
  const [est, setEst] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    void navigator.storage
      ?.estimate?.()
      .then((e) => setEst({ usage: e.usage ?? 0, quota: e.quota ?? 0 }));
  }, []);
  if (!est) return <span className="text-sm text-slate-500">-</span>;
  return (
    <span className="font-mono text-sm tabular-nums">
      {formatBytes(est.usage)} / {formatBytes(est.quota)}
    </span>
  );
}

const CONTEXT_OPTIONS = [2048, 4096, 8192, 16384, 32768].map((n) => ({
  value: String(n),
  label: `${n.toLocaleString()} トークン`,
}));

type ConfirmKind = null | 'reset' | 'progress' | 'all';

export default function SettingsPage() {
  const s = useSettings();
  const update = s.update;
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const webgpu = useEngine((st) => st.webgpu);

  const clearAll = async () => {
    try {
      await clearAppData();
      toast.success('このアプリのデータを消しました');
      // 画面が持っている古い状態を捨てるため、読み込み直す
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      toast.error(`消せませんでした: ${errorMessage(e)}`);
    }
  };

  return (
    <>
      <PageHeader title="設定" />
      <PageBody>
        <Section collapsible defaultOpen storageKey="settings" title="表示" icon={<Palette />}>
          <Field
            label="テーマ"
            htmlFor="theme"
            hint="ヘッダーの太陽・月のボタンでも切り替えられます"
          >
            <Select
              id="theme"
              value={s.theme}
              onChange={(v) => update({ theme: v as ThemeSetting })}
              options={(Object.keys(THEME_LABELS) as ThemeSetting[]).map((v) => ({
                value: v,
                label: THEME_LABELS[v],
              }))}
              className="w-44"
            />
          </Field>
          <Field
            label="ダークモードの配色"
            hint="ダークモードのときの色合い。落ち着いた配色は、彩度を抑えて長く見ていても疲れにくくしています"
            stacked
          >
            <div
              className="grid gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label="ダークモードの配色"
            >
              {(Object.keys(DARK_PALETTE_LABELS) as DarkPalette[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={s.darkPalette === k}
                  onClick={() => update({ darkPalette: k })}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
                    s.darkPalette === k
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/30'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                  )}
                >
                  <PaletteSwatch palette={k} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {DARK_PALETTE_LABELS[k].label}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {DARK_PALETTE_LABELS[k].hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="本文の文字の大きさ" htmlFor="font-scale" hint="レッスン・問題の文字">
            <Select
              id="font-scale"
              value={s.fontScale}
              onChange={(v) => update({ fontScale: v as FontScale })}
              options={(Object.keys(FONT_SCALES) as FontScale[]).map((v) => ({
                value: v,
                label: FONT_SCALES[v].label,
              }))}
              className="w-32"
            />
          </Field>
        </Section>

        <Section
          collapsible
          storageKey="settings"
          title="AI パートナー"
          icon={<Bot />}
          description="性格と、AI にどこまで任せるか"
        >
          <Link
            href="/models"
            className="flex items-center gap-3 px-4 py-3.5 text-sm hover:bg-slate-50 sm:px-5 dark:hover:bg-slate-800/40"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium">AI モデル</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                ダウンロード・読み込み・保存済みモデルの管理・バックアップ
              </span>
            </span>
            <ModelStatusChip plain className="max-w-40" />
            <ChevronRight className="size-5 shrink-0 text-slate-400" />
          </Link>
          <div className="space-y-2 px-4 py-3.5 sm:px-5">
            <div className="text-sm font-medium">性格</div>
            <PersonaPicker value={s.persona} onChange={(persona) => update({ persona })} />
            {s.persona === CUSTOM_PERSONA_ID && (
              <textarea
                value={s.customPersona}
                onChange={(e) => update({ customPersona: e.target.value })}
                rows={3}
                aria-label="カスタムの性格"
                placeholder="例: あなたは関西弁で話す陽気な税理士です。ツッコミを入れつつ、要点はしっかり教えます。"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            )}
          </div>
          <Field
            label="あなたの立場（任意）"
            htmlFor="user-role"
            hint="説明の深さや例の選び方の参考にしてもらいます。端末の外には出ません"
            stacked
          >
            <Select
              id="user-role"
              value={s.userRole}
              onChange={(v) => update({ userRole: v as UserRole })}
              options={(Object.keys(USER_ROLE_LABELS) as UserRole[]).map((v) => ({
                value: v,
                label: USER_ROLE_LABELS[v],
              }))}
            />
          </Field>
          <Field
            label="問題を解いたときのひとこと"
            htmlFor="reaction"
            hint="答え合わせの結果（プログラムが採点）に、性格に合わせてひとこと返します"
            stacked
          >
            <Select
              id="reaction"
              value={s.reaction}
              onChange={(v) => update({ reaction: v as ReactionMode })}
              options={(Object.keys(REACTION_LABELS) as ReactionMode[]).map((v) => ({
                value: v,
                label: REACTION_LABELS[v],
              }))}
            />
          </Field>
          <Field
            label="AI 解説のボタンを出す"
            htmlFor="ai-button"
            hint="画面の右下に、見ている内容を AI が解説するボタンを出します"
          >
            <Switch
              id="ai-button"
              checked={s.showAiButton}
              onChange={(v) => update({ showAiButton: v })}
            />
          </Field>
          <Field
            label="見ている内容を AI に伝える"
            htmlFor="share-state"
            hint="チャットで、見ていたページ・問題・帳簿・学習の進み具合を構造化データで渡します（端末の外には出ません）"
          >
            <Switch
              id="share-state"
              checked={s.shareAppState}
              onChange={(v) => update({ shareAppState: v })}
            />
          </Field>
          <Field
            label="AI にツールを使わせる"
            htmlFor="use-tools"
            hint="勘定科目の検索・仕訳の検証・消費税の計算・学習記録や帳簿の集計を、AI がアプリのプログラムで調べます"
          >
            <Switch id="use-tools" checked={s.useTools} onChange={(v) => update({ useTools: v })} />
          </Field>
          <Field
            label="追加の指示（任意）"
            htmlFor="extra"
            stacked
            hint="AI へのお願いを書けます（例: 解説は短めに、例は飲食店で）"
          >
            <textarea
              id="extra"
              value={s.extraInstructions}
              onChange={(e) => update({ extraInstructions: e.target.value })}
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
          </Field>
        </Section>

        <Section
          collapsible
          storageKey="settings"
          title="AI の応答・チャット"
          icon={<Gauge />}
          description="応答のしかたと、チャットの操作（次の送信から反映）"
        >
          <Field
            label="Temperature"
            htmlFor="temperature"
            hint="高いほど多様、低いほど安定（0 で常に同じ応答）"
          >
            <Slider
              id="temperature"
              value={s.temperature}
              min={0}
              max={2}
              step={0.05}
              onChange={(v) => update({ temperature: v })}
              format={(v) => v.toFixed(2)}
            />
          </Field>
          <Field label="最大出力トークン数" htmlFor="max-output">
            <Slider
              id="max-output"
              value={s.maxOutputTokens}
              min={128}
              max={4096}
              step={128}
              onChange={(v) => update({ maxOutputTokens: v })}
            />
          </Field>
          <Field
            label="考えてから答える（思考モード）"
            htmlFor="thinking"
            hint="対応モデルのみ。回答の質が上がることがありますが遅くなります。チャットでは入力欄の「考える」で送信ごとに切り替えられます"
          >
            <Switch
              id="thinking"
              checked={s.enableThinking}
              onChange={(v) => update({ enableThinking: v })}
            />
          </Field>
          <Field
            label="生成の統計を表示"
            htmlFor="show-stats"
            hint="チャットの応答の下に、かかった時間と速さを表示します"
          >
            <Switch
              id="show-stats"
              checked={s.showStats}
              onChange={(v) => update({ showStats: v })}
            />
          </Field>
          <Field
            label="Enter で送信"
            htmlFor="enter-send"
            hint="オフ: Ctrl/⌘ + Enter で送信（スマホは常に改行）"
          >
            <Switch
              id="enter-send"
              checked={s.enterToSend}
              onChange={(v) => update({ enterToSend: v })}
            />
          </Field>
          <Field
            label="チャットの文脈を残す（実験的）"
            htmlFor="keep-chat"
            hint="解説・ひとことなどを生成したあとも、チャットで読み込み済みの会話を残し、次の送信で読み直さずに済むようにします。メモリを多く使うので、動作が不安定になったらオフにしてください"
            stacked
          >
            <Switch
              id="keep-chat"
              checked={s.keepChatContext}
              onChange={(v) => update({ keepChatContext: v })}
            />
          </Field>
        </Section>

        <Section
          collapsible
          storageKey="settings"
          title="AI エンジン"
          icon={<HardDrive />}
          description="変更後はモデルの再読み込みが必要です"
        >
          <Field
            label="バックエンド"
            htmlFor="backend"
            hint={
              webgpu === false
                ? 'この端末では WebGPU が使えません（自動なら CPU で実行）'
                : '自動: WebGPU が使えれば GPU、使えなければ CPU'
            }
          >
            <Select
              id="backend"
              value={s.backend}
              onChange={(v) => update({ backend: v as BackendSetting })}
              options={(Object.keys(BACKEND_SETTING_LABELS) as BackendSetting[]).map((v) => ({
                value: v,
                label: BACKEND_SETTING_LABELS[v],
              }))}
              className="w-40"
            />
          </Field>
          <Field
            label="文脈長"
            htmlFor="context"
            hint="会話で覚えておける長さ。大きいほどメモリを使います"
          >
            <Select
              id="context"
              value={String(s.maxNumTokens)}
              onChange={(v) => update({ maxNumTokens: Number(v) })}
              options={CONTEXT_OPTIONS}
              className="w-40"
            />
          </Field>
          <Field label="起動時に前回のモデルを読み込む" htmlFor="auto-load">
            <Switch
              id="auto-load"
              checked={s.autoLoadLastModel}
              onChange={(v) => update({ autoLoadLastModel: v })}
            />
          </Field>
          <Field
            label="取り込んだモデルをブラウザに保存"
            htmlFor="save-models"
            hint="同じ github.io のほかのサイトとも共有されます"
          >
            <Switch
              id="save-models"
              checked={s.saveImportedModels && isOpfsSupported()}
              disabled={!isOpfsSupported()}
              onChange={(v) => update({ saveImportedModels: v })}
            />
          </Field>
        </Section>

        <Section collapsible storageKey="settings" title="データ" icon={<Database />}>
          <Field
            label="使用中の保存領域"
            hint="同じ github.io のほかのサイト（共有の AI モデルなど）の分も含みます"
          >
            <StorageUsage />
          </Field>
          <Field label="設定を初期値に戻す" hint="学習記録やデータは消えません">
            <Button size="sm" onClick={() => setConfirm('reset')}>
              <RotateCcw />
              戻す
            </Button>
          </Field>
          <Field
            label="学習記録を消す"
            hint="読んだレッスンの印と、問題の答え合わせの記録を消します"
          >
            <Button size="sm" onClick={() => setConfirm('progress')}>
              <Trash2 />
              クリア
            </Button>
          </Field>
          <Field
            label="すべてのデータを消す"
            hint="設定・学習記録・帳簿・チャットなど、このアプリのデータをすべて消します。AI モデル（ほかのサイトと共有）は消えません。モデルは「AI モデル」の画面で消せます"
          >
            <Button size="sm" variant="danger" onClick={() => setConfirm('all')}>
              <Trash2 />
              クリア
            </Button>
          </Field>
        </Section>
      </PageBody>

      <ConfirmDialog
        open={confirm === 'reset'}
        title="設定を初期値に戻しますか？"
        description="表示や AI の設定が初期値に戻ります。学習記録やデータは消えません。"
        confirmLabel="戻す"
        onConfirm={() => {
          s.reset();
          toast.success('設定を初期値に戻しました');
        }}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'progress'}
        title="学習記録を消しますか？"
        description="読んだレッスンの印と、問題の答え合わせの記録を消します。帳簿やチャットは残ります。元に戻せません。"
        confirmLabel="消す"
        danger
        onConfirm={() =>
          void Promise.all([db.lessonProgress.clear(), db.drillAttempts.clear()]).then(
            () => toast.success('学習記録を消しました'),
            (e) => toast.error(`消せませんでした: ${errorMessage(e)}`),
          )
        }
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'all'}
        title="すべてのデータを消しますか？"
        description="このアプリの設定・学習記録・帳簿の仕訳・チャットの履歴をすべて消します。元に戻せません。ダウンロードした AI モデル（ほかのサイトと共有）は消えません。"
        confirmLabel="すべて消す"
        danger
        onConfirm={() => void clearAll()}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
