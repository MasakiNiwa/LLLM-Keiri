import type { ReactNode } from 'react';
import {
  BookOpenText,
  ExternalLink,
  Info,
  LifeBuoy,
  MonitorCheck,
  Scale,
  Smartphone,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { useChat } from '@/features/chat/chatStore';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';
import { CapabilityCheck } from '@/features/help/CapabilityCheck';
import { Card, Section } from '@/components/ui/Card';
import { LicenseList } from '@/features/help/LicenseList';
import {
  APP_TAGLINE,
  APP_TITLE,
  LITERTLM_URL,
  LLLM_STUDY_URL,
  REPOSITORY_URL,
  TRY_LOCAL_URL,
} from '@/lib/constants';

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-accent-700 underline-offset-2 hover:underline dark:text-accent-300"
    >
      {children}
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <div className="space-y-2 px-4 py-3.5 text-sm leading-relaxed sm:px-5">{children}</div>;
}

export default function HelpPage() {
  const [, navigate] = useLocation();
  /** チャットを使い方モードで開く */
  const askAi = () => {
    useChat.getState().setHelpMode(true);
    navigate('/chat');
  };
  return (
    <>
      <PageHeader title="ヘルプ" />
      <PageBody>
        <Card className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <img src="./favicon.svg" alt="" className="size-12" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{APP_TITLE}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{APP_TAGLINE}</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">バージョン</dt>
            <dd className="font-mono">v{__APP_VERSION__}</dd>
            <dt className="text-slate-500 dark:text-slate-400">推論エンジン</dt>
            <dd className="font-mono">LiteRT-LM {__LITERTLM_VERSION__}</dd>
            <dt className="text-slate-500 dark:text-slate-400">AI モデル</dt>
            <dd>
              <ModelStatusChip className="max-w-56" />
            </dd>
            <dt className="text-slate-500 dark:text-slate-400">ライセンス</dt>
            <dd>MIT License</dd>
            <dt className="text-slate-500 dark:text-slate-400">ソースコード</dt>
            <dd className="min-w-0 truncate">
              <ExtLink href={REPOSITORY_URL}>GitHub リポジトリ</ExtLink>
            </dd>
          </dl>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <Button size="sm" variant="secondary" onClick={askAi}>
              <LifeBuoy />
              AI に使い方を聞く
            </Button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              このヘルプをもとに、AI が答えます（AI モデルが必要）
            </span>
          </div>
        </Card>

        <Section
          title="このアプリについて"
          icon={<Info />}
          collapsible
          defaultOpen
          storageKey="help"
        >
          <Body>
            <p>
              <strong>日本の経理を学ぶための、ローカル LLM 付きの学習サイト</strong>です。
              簿記の基本から、日々の経理・決算・税務・会計基準までを、仕訳を動かしながら学べます。
            </p>
            <p>
              仕訳の正誤・貸借の一致・帳簿の集計はプログラムが正確に行い、ブラウザの中で動く AI
              は解説・リアクション・質問への回答を担当します（AI
              モデルがなくても学習機能はすべて使えます）。
            </p>
            <p>
              学習内容には「根拠（基準・法令）」と「基準日」を表示しています。会計基準や税制は改正されるので、
              実務では最新の基準・法令や専門家の確認を優先してください。
            </p>
          </Body>
        </Section>

        <Section title="使い方" icon={<BookOpenText />} collapsible storageKey="help">
          <Body>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>学ぶ</strong>: 分野ごとのレッスンを読みます。仕訳は「借方 /
                貸方」の形で表示されます
              </li>
              <li>
                <strong>練習</strong>:
                仕訳の問題を解きます。プログラムがその場で採点し、違いを示します
              </li>
              <li>
                <strong>帳簿</strong>:
                自分で仕訳を入れると、元帳・試算表・決算書が自動でできあがります
              </li>
              <li>
                <strong>AI</strong>: AI に質問・相談できます（AI モデルのダウンロードが必要）
              </li>
              <li>
                ヘッダー右上の <strong>太陽・月</strong> のボタンでライト・ダークを切り替え、
                <strong>？</strong> のボタンでこのヘルプを開きます
              </li>
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ※ 現在は初期版です。機能は順に追加していきます。
            </p>
          </Body>
        </Section>

        <Section title="ローカル AI" icon={<Sparkles />} collapsible storageKey="help">
          <Body>
            <p>
              AI は <ExtLink href={LITERTLM_URL}>LiteRT-LM</ExtLink>{' '}
              を使ってブラウザの中で動きます（WebGPU 対応の Chrome / Edge
              を推奨）。会話や学習の内容は外部に送信されません。
            </p>
            <p>
              ダウンロードした AI モデルは、同じ github.io のほかのサイト（
              <ExtLink href={LLLM_STUDY_URL}>LLLM Study</ExtLink>・
              <ExtLink href={TRY_LOCAL_URL}>Try Local</ExtLink> など）と共有します。
              ほかのサイトで保存済みのモデルは、そのまま使えます。
            </p>
          </Body>
        </Section>

        <Section
          title="動作環境の確認"
          description="この端末で AI が動くかを調べます"
          icon={<MonitorCheck />}
          collapsible
          storageKey="help"
        >
          <CapabilityCheck />
        </Section>

        <Section title="スマホで使う" icon={<Smartphone />} collapsible storageKey="help">
          <Body>
            <p>
              ブラウザのメニューから「ホーム画面に追加」すると、アプリのように使えます。
              一度開けば、オフラインでも起動できます。
            </p>
          </Body>
        </Section>

        <Section title="データとプライバシー" icon={<ShieldCheck />} collapsible storageKey="help">
          <Body>
            <p>
              設定・学習記録などはこの端末のブラウザの中だけに保存されます。
              「設定」→「データ」→「すべてのデータを消す」で消せます（共有の AI
              モデルは消えません）。
            </p>
          </Body>
        </Section>

        <Section
          title="クレジットとライセンス"
          description="このアプリは MIT License で公開しています。利用しているオープンソースソフトウェアとライセンスの全文です"
          icon={<Scale />}
          collapsible
          storageKey="help"
        >
          <Body>
            <p>
              ソースコード: <ExtLink href={REPOSITORY_URL}>{REPOSITORY_URL}</ExtLink>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              AI
              モデルはこのアプリに含まれず、それぞれのモデルのライセンス・利用規約が適用されます。
              学習内容は本リポジトリの作者が作成したものです（AI
              を利用して作成したものを含みます）。
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              経理カレンダーの祝日は{' '}
              <ExtLink href="https://github.com/holiday-jp/holiday_jp">
                holiday-jp/holiday_jp
              </ExtLink>{' '}
              のデータ（MIT License・Copyright (c) 2016 holiday-jp）を使っています。
            </p>
          </Body>
          <LicenseList />
        </Section>
      </PageBody>
    </>
  );
}
