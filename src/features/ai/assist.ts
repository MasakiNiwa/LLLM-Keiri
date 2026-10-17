/**
 * フロートの AI 解説: 見ている内容（構造化データ）と頼み方から、単発の生成のプロンプトを作る。
 */
import type { AppState } from './appContext';
import { formatAppState } from './appContext';
import type { AiFocus } from './focusStore';

export interface AssistAction {
  id: string;
  label: string;
  /** AI への頼み方 */
  instruction: string;
}

/** 見ているものに合わせた頼み方の候補 */
export function assistActions(focus: AiFocus): AssistAction[] {
  switch (focus.kind) {
    case 'lesson':
      return [
        {
          id: 'explain',
          label: 'この部分を解説',
          instruction:
            'いま読んでいる部分（viewing.excerpt）の要点を、初めて学ぶ人にも分かるように解説してください。仕訳があれば、なぜその科目・その側になるのかも説明してください。',
        },
        {
          id: 'example',
          label: '具体例を出して',
          instruction:
            'いま読んでいる部分の内容について、身近な会社の取引の具体例を 1〜2 個出し、仕訳の形で示してください。',
        },
        {
          id: 'simple',
          label: 'もっとやさしく',
          instruction:
            'いま読んでいる部分を、簿記を知らない人でも分かるたとえを使って、もっとやさしく説明してください。',
        },
        {
          id: 'practice',
          label: '実務ではどう？',
          instruction:
            'いま読んでいる部分が、会社の経理の実務でどんな場面で出てくるか、注意点とあわせて教えてください。',
        },
      ];
    case 'drill':
      return focus.revealed || focus.judge?.correct
        ? [
            {
              id: 'why',
              label: 'この仕訳を解説',
              instruction:
                '正解の仕訳（viewing.answer）について、各行の科目がなぜその側（借方・貸方）になるのか、5 つの要素の増減で説明してください。',
            },
            {
              id: 'similar',
              label: '似た取引は？',
              instruction:
                'この問題と似ていて間違えやすい取引を 1〜2 個挙げ、正しい仕訳と違いを説明してください。',
            },
          ]
        : focus.judge
          ? [
              {
                id: 'mistake',
                label: 'どこが違う？',
                instruction:
                  'プログラムの採点結果（viewing.judge）とユーザーの答え（viewing.userAnswer）をもとに、どう考えればよいかを一緒に整理してください。正解の仕訳そのものはまだ言わないでください。',
              },
              {
                id: 'hint',
                label: 'ヒントをちょうだい',
                instruction:
                  'この問題を解くためのヒントを、答えそのものは言わずに 2〜3 文で教えてください（何が増えて何が減ったかを考えさせる）。',
              },
            ]
          : [
              {
                id: 'hint',
                label: 'ヒントをちょうだい',
                instruction:
                  'この問題を解くためのヒントを、答えそのものは言わずに 2〜3 文で教えてください（何が増えて何が減ったかを考えさせる）。',
              },
              {
                id: 'think',
                label: '一緒に考えて',
                instruction:
                  'この取引で動いたものを一緒に順番に整理してください（何が増えた・減った・発生した）。正解の仕訳そのものは言わないでください。',
              },
            ];
    case 'ledger':
      return [
        {
          id: 'read',
          label: '帳簿を読んで',
          instruction:
            '帳簿の集計（viewing の残高・当期純利益）から読み取れることを、簡単にコメントしてください。数字は渡したものだけを使ってください。',
        },
        {
          id: 'statements',
          label: '決算書の見方',
          instruction:
            'この帳簿の貸借対照表と損益計算書の見方を、残高の数字を例にしてやさしく説明してください。',
        },
        {
          id: 'next',
          label: '次に入れる仕訳は？',
          instruction:
            'この帳簿で、決算に向けて入れたほうがよい仕訳（決算整理など）があれば、考え方とあわせて提案してください。',
        },
      ];
    case 'accounts':
      return [
        {
          id: 'confusing',
          label: '間違えやすい科目',
          instruction:
            '初心者が間違えやすい勘定科目の組み合わせを 3 つ挙げ、見分け方を説明してください。',
        },
      ];
    default:
      return [
        {
          id: 'next',
          label: '次は何を学ぶ？',
          instruction:
            '学習の進み具合（progress）をもとに、次に学ぶとよいことを 1〜2 個すすめてください。',
        },
      ];
  }
}

/** 単発の生成に渡すプロンプト（アプリの状態＋頼み方） */
export function buildAssistPrompt(state: AppState, instruction: string, question?: string): string {
  const ask = question?.trim()
    ? `ユーザーの質問: ${question.trim()}\n見ている内容をふまえて答えてください。`
    : instruction;
  return `${formatAppState(state)}\n\n${ask}`;
}

/** 問題の採点結果へのひとこと（AI が考えるとき）のプロンプト */
export function buildReactionPrompt(state: AppState): string {
  return `${formatAppState(state)}\n\nユーザーがこの問題で答え合わせをしました。プログラムの採点結果（viewing.judge）に、あなたの性格らしいひとことでリアクションしてください。1〜2 文・40 字程度。不正解のときは正解の仕訳を言わず、励ましか考え方のきっかけだけにしてください。ひとことだけを出力します。`;
}
