/**
 * 学習データの検証と変換（ビルド時の content/ と、外部 AI で作ったデータの取り込みで共通）。
 *
 * - レッスン: Markdown（先頭に YAML の frontmatter）。` ```shiwake ` は貸借の一致と勘定科目を確かめ、
 *   ` ```quiz ` は YAML（または JSON）を検証して JSON に置き換える
 * - 問題セット・帳簿のサンプル: オブジェクト（YAML・JSON を読んだもの）
 *
 * ※ Node から直接読み込むため、このファイルからの import は拡張子付きの相対パスにする。
 */
import { parse as parseYaml } from 'yaml';
import type { z } from 'zod';
import { isBalanced, totals } from '../journal/balance.ts';
import { parseShiwake } from '../journal/parse.ts';
import type { JournalEntry } from '../journal/types.ts';
import type { AccountBook } from './accounts.ts';
import {
  ConsolidationCaseSchema,
  DrillSetSchema,
  LessonFrontmatterSchema,
  QuizSchema,
  ScenarioSchema,
  type ConsolidationCase,
  type DrillSet,
  type Heading,
  type Lesson,
  type Scenario,
} from './schema.ts';

export function formatZod(e: z.ZodError): string {
  return e.issues.map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`).join('; ');
}

/** 本文から ``` で囲まれたブロックを探す */
export const FENCE_RE = /^```([\w-]+)?[^\n]*\n([\s\S]*?)^```[ \t]*$/gm;

/** 見出し（h2・h3）を本文の順に取り出す。コードブロックの中は除く */
export function extractHeadings(body: string): Heading[] {
  const withoutCode = body.replace(FENCE_RE, '');
  const headings: Heading[] = [];
  for (const m of withoutCode.matchAll(/^(#{2,3})\s+(.+?)\s*#*\s*$/gm)) {
    headings.push({
      id: `sec-${headings.length + 1}`,
      depth: m[1].length as 2 | 3,
      text: m[2].replace(/[*_`]/g, ''),
    });
  }
  return headings;
}

/** 検索用に Markdown の記号を落とした本文 */
export function plainText(body: string): string {
  return body
    .replace(/^```quiz[\s\S]*?^```$/gm, '')
    .replace(/[#>*_`|[\]()-]/g, ' ')
    .replace(/\[!\w+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 仕訳や問題を、勘定科目のマスタに照らして確かめる。見つけた問題は errors に足していく。
 */
export class ContentChecker {
  readonly book: AccountBook;
  readonly errors: string[];

  constructor(book: AccountBook, errors: string[] = []) {
    this.book = book;
    this.errors = errors;
  }

  /** 仕訳の書き方を検証する（読めない行・貸借の不一致・知らない科目） */
  checkShiwake(text: string, where: string): JournalEntry[] {
    const { entries, issues } = parseShiwake(text);
    for (const i of issues)
      this.errors.push(`${where}: ${i.line ? `${i.line} 行目: ` : ''}${i.message}`);
    if (entries.length === 0 && issues.length === 0) this.errors.push(`${where}: 仕訳がありません`);
    for (const e of entries) {
      if (!isBalanced(e)) {
        const t = totals(e.lines);
        this.errors.push(
          `${where}: 貸借が一致していません（借方 ${t.dr.toLocaleString()} / 貸方 ${t.cr.toLocaleString()}）${e.caption ? `「${e.caption}」` : ''}`,
        );
      }
      for (const l of e.lines) {
        if (!this.book.find(l.account))
          this.errors.push(`${where}: 勘定科目「${l.account}」が勘定科目の一覧にありません`);
        if (l.amount <= 0) this.errors.push(`${where}: 金額は正の数で書きます（${l.account}）`);
      }
    }
    return entries;
  }

  /** 問題の正解・選べる科目を確かめる */
  checkQuestion(q: { answer: string; accounts?: string[] }, where: string): void {
    const entries = this.checkShiwake(q.answer, `${where} の正解`);
    if (entries.length > 1) this.errors.push(`${where}: 正解の仕訳は 1 つにします`);
    for (const name of q.accounts ?? []) {
      if (!this.book.find(name)) this.errors.push(`${where}: 選べる科目「${name}」がありません`);
    }
    if (q.accounts && entries[0]) {
      const choices = new Set(q.accounts.map((n) => this.book.canonical(n)));
      for (const l of entries[0].lines) {
        if (!choices.has(this.book.canonical(l.account)))
          this.errors.push(`${where}: 正解の科目「${l.account}」が選べる科目にありません`);
      }
    }
  }
}

/** レッスンの Markdown を検証して変換する。形が読めなければ null（問題は checker.errors に） */
export function compileLesson(raw: string, where: string, checker: ContentChecker): Lesson | null {
  const errors = checker.errors;
  const text = raw.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!fm) {
    errors.push(`${where}: 先頭に --- で囲んだ YAML（frontmatter）がありません`);
    return null;
  }
  let data: unknown;
  try {
    data = parseYaml(fm[1]);
  } catch (e) {
    errors.push(`${where}: frontmatter を読めません: ${(e as Error).message}`);
    return null;
  }
  const parsed = LessonFrontmatterSchema.safeParse(data);
  if (!parsed.success) {
    errors.push(`${where}: ${formatZod(parsed.error)}`);
    return null;
  }
  let quizCount = 0;
  const body = text
    .slice(fm[0].length)
    .replace(FENCE_RE, (block, lang: string | undefined, code: string) => {
      if (lang === 'shiwake') {
        checker.checkShiwake(code, `${where}（仕訳）`);
        return block;
      }
      if (lang !== 'quiz') return block;
      quizCount++;
      const qWhere = `${where}（確認問題 ${quizCount}）`;
      let q: unknown;
      try {
        q = parseYaml(code);
      } catch (e) {
        errors.push(`${qWhere}: YAML を読めません: ${(e as Error).message}`);
        return block;
      }
      const r = QuizSchema.safeParse(q);
      if (!r.success) {
        errors.push(`${qWhere}: ${formatZod(r.error)}`);
        return block;
      }
      if (r.data.type === 'choice' && r.data.answer >= r.data.choices.length)
        errors.push(`${qWhere}: answer が選択肢の数を超えています`);
      if (r.data.type === 'shiwake') checker.checkQuestion(r.data, qWhere);
      return '```quiz\n' + JSON.stringify(r.data) + '\n```';
    });
  return {
    meta: {
      ...parsed.data,
      headings: extractHeadings(body),
      // 日本語は 1 分あたり 500 字ほどを目安にする
      minutes: Math.max(1, Math.round(plainText(body).length / 500)),
      quizCount,
    },
    body,
  };
}

/** 問題セットを検証する */
export function compileDrill(
  data: unknown,
  where: string,
  checker: ContentChecker,
): DrillSet | null {
  const r = DrillSetSchema.safeParse(data);
  if (!r.success) {
    checker.errors.push(`${where}: ${formatZod(r.error)}`);
    return null;
  }
  const qids = new Set<string>();
  for (const q of r.data.questions) {
    if (qids.has(q.id)) checker.errors.push(`${where}: 問題の id「${q.id}」が重複しています`);
    qids.add(q.id);
    checker.checkQuestion(q, `${where}（問題 ${q.id}）`);
  }
  return r.data;
}

/** 帳簿のサンプルを検証する */
export function compileScenario(
  data: unknown,
  where: string,
  checker: ContentChecker,
): Scenario | null {
  const r = ScenarioSchema.safeParse(data);
  if (!r.success) {
    checker.errors.push(`${where}: ${formatZod(r.error)}`);
    return null;
  }
  r.data.entries.forEach((e, i) => {
    const entries = checker.checkShiwake(e.shiwake, `${where}（${i + 1} 件目 ${e.date}）`);
    if (entries.length > 1) checker.errors.push(`${where}（${i + 1} 件目）: 仕訳は 1 つにします`);
  });
  return r.data;
}

/** 連結の事例を検証する（各社の試算表と連結修正仕訳の貸借・科目、親会社は 1 社、在外子会社のレート） */
export function compileConsolidation(
  data: unknown,
  where: string,
  checker: ContentChecker,
): ConsolidationCase | null {
  const r = ConsolidationCaseSchema.safeParse(data);
  if (!r.success) {
    checker.errors.push(`${where}: ${formatZod(r.error)}`);
    return null;
  }
  const c = r.data;
  const parents = c.entities.filter((e) => e.role === 'parent');
  if (parents.length !== 1) checker.errors.push(`${where}: 親会社（role: parent）は 1 社にします`);
  if (parents[0] && parents[0].currency !== 'JPY')
    checker.errors.push(`${where}: 親会社の通貨は JPY にします`);
  const ids = new Set<string>();
  for (const e of c.entities) {
    const w = `${where}（${e.name}）`;
    if (ids.has(e.id)) checker.errors.push(`${w}: id「${e.id}」が重複しています`);
    ids.add(e.id);
    if (e.role === 'subsidiary' && e.ownership === undefined)
      checker.errors.push(`${w}: 子会社には ownership（持分割合 %）を書きます`);
    if (e.currency !== 'JPY' && !e.rates)
      checker.errors.push(`${w}: 円以外の通貨の会社には rates（CR・AR・HR）を書きます`);
    const entries = checker.checkShiwake(e.trialBalance, `${w} の試算表`);
    if (entries.length > 1)
      checker.errors.push(`${w}: 試算表は 1 つのまとまりで書きます（空行を入れない）`);
    for (const name of Object.keys(e.historical)) {
      if (!checker.book.find(name))
        checker.errors.push(`${w}: historical の科目「${name}」がありません`);
    }
  }
  if (c.opening) {
    const w = `${where}（期首の連結貸借対照表）`;
    const entries = checker.checkShiwake(c.opening.balanceSheet, w);
    for (const l of entries.flatMap((e) => e.lines)) {
      const el = checker.book.find(l.account)?.element;
      if (el === 'revenue' || el === 'expense')
        checker.errors.push(`${w}: 「${l.account}」は貸借対照表の科目ではありません`);
    }
  }
  const elimIds = new Set<string>();
  for (const el of c.eliminations) {
    const w = `${where}（修正仕訳 ${el.id}）`;
    if (elimIds.has(el.id)) checker.errors.push(`${w}: id が重複しています`);
    elimIds.add(el.id);
    const entries = checker.checkShiwake(el.shiwake, w);
    if (entries.length > 1) checker.errors.push(`${w}: 修正仕訳は 1 つにします`);
  }
  return c;
}
