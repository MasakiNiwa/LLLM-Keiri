import { create } from 'zustand';

/**
 * AI に「今ユーザーが見ているもの」を伝えるための状態（構造化データ）。
 * 各ページが表示している内容をここに入れ、AI の解説・チャット・ひとことで使う。
 */
export type AiFocus =
  | { kind: 'home' }
  | {
      kind: 'lesson';
      lessonId: string;
      title: string;
      track: string;
      summary: string;
      asOf: string;
      basis: string[];
      headings: string[];
      /** いま読んでいる見出し */
      section?: string;
      /** いま読んでいる部分の本文（Markdown。長いときは途中まで） */
      excerpt?: string;
    }
  | {
      kind: 'drill';
      setId: string;
      setTitle: string;
      questionId: string;
      question: string;
      /** 何問目か */
      position: string;
      /** 正解を見た・答え合わせで正解した（AI が答えを言ってよい） */
      revealed: boolean;
      /** 正解の仕訳（revealed のときだけ） */
      answer?: string;
      explanation?: string;
      /** ユーザーが入力した仕訳（答え合わせしたとき） */
      userAnswer?: string;
      /** プログラムの採点結果 */
      judge?: { kind: string; correct: boolean; messages: string[] };
    }
  | {
      kind: 'ledger';
      tab: string;
      entryCount: number;
      /** 勘定科目ごとの残高（借方残高は正、貸方残高は負） */
      balances: Record<string, number>;
      trialBalanced: boolean;
      netIncome: number;
      unsettled: string[];
      /** 財務分析の比率（分析のタブを見ているとき。プログラムが計算した値） */
      ratios?: Record<string, string>;
    }
  | {
      kind: 'consolidation';
      caseTitle: string;
      tab: string;
      unit: string;
      entities: string[];
      eliminationsApplied: string[];
      eliminationsOff: string[];
      /** プログラムが計算した連結の主な数字 */
      figures: {
        totalAssets: number;
        netIncome: number;
        nciProfit: number;
        parentNetIncome: number;
      };
      /** ドリルダウンで見ている科目の内訳（借方が正） */
      drilldown?: {
        account: string;
        byEntity: Record<string, number>;
        byElimination: Record<string, number>;
        consolidated: number;
        sign: string;
      };
      /** セグメント情報（セグメントのタブを見ているとき） */
      segments?: {
        segments: Record<
          string,
          { sales: number; intersegmentSales: number; profit: number; assets: number }
        >;
        adjustments: { sales: number; profit: number; assets: number };
        consolidated: { sales: number; profit: number; assets: number };
        note: string;
      };
      /** 連結キャッシュ・フロー計算書の区分ごとの合計（CF のタブを見ているとき） */
      cashFlow?: Record<string, number>;
      /** 財務分析の比率（分析のタブを見ているとき） */
      ratios?: Record<string, string>;
    }
  | { kind: 'accounts'; account?: string }
  | { kind: 'other'; page: string };

export const FOCUS_LABELS: Record<AiFocus['kind'], string> = {
  home: 'ホーム',
  lesson: 'レッスン',
  drill: '仕訳問題',
  ledger: '帳簿',
  consolidation: '連結',
  accounts: '勘定科目',
  other: 'ページ',
};

/** 画面に出す短い説明（「レッスン『5 つの要素』」など） */
export function focusTitle(f: AiFocus): string {
  switch (f.kind) {
    case 'lesson':
      return `レッスン「${f.title}」${f.section ? `の「${f.section}」` : ''}`;
    case 'drill':
      return `問題「${f.setTitle}」${f.position}`;
    case 'ledger':
      return `帳簿（${f.entryCount} 件の仕訳）`;
    case 'consolidation':
      return `連結「${f.caseTitle}」${f.drilldown ? `の「${f.drilldown.account}」` : ''}`;
    case 'accounts':
      return f.account ? `勘定科目「${f.account}」` : '勘定科目の辞典';
    case 'home':
      return 'ホーム';
    case 'other':
      return f.page;
  }
}

interface AiFocusState {
  /** いま表示しているページの内容 */
  current: AiFocus;
  /** チャットに添付した内容（「チャットで続ける」から来たとき） */
  attached: AiFocus | null;
  set: (focus: AiFocus) => void;
  /** 今の内容の一部だけを変える（同じ種類のときだけ） */
  patch: <K extends AiFocus['kind']>(
    kind: K,
    patch: Partial<Extract<AiFocus, { kind: K }>>,
  ) => void;
  attach: (focus: AiFocus | null) => void;
}

export const useAiFocus = create<AiFocusState>()((set) => ({
  current: { kind: 'home' },
  attached: null,
  set: (current) => set({ current }),
  patch: (kind, patch) =>
    set((s) => (s.current.kind === kind ? { current: { ...s.current, ...patch } as AiFocus } : s)),
  attach: (attached) => set({ attached }),
}));
