/**
 * 学習データ（content/）を読み込み、検証して、アプリが fetch する JSON にする。
 *
 * - レッスン: Markdown（先頭に YAML の frontmatter）。` ```shiwake ` は貸借の一致と勘定科目を確かめ、
 *   ` ```quiz ` は YAML を検証して JSON に置き換える
 * - 勘定科目・分野・税率など・問題セット: YAML
 *
 * Vite のプラグイン（vite-plugin-content.ts）と、CI の検証（scripts/check-content.ts）から使う。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { AccountBook } from '../src/lib/content/accounts.ts';
import {
  AccountSchema,
  DrillSetSchema,
  LessonFrontmatterSchema,
  QuizSchema,
  RuleSchema,
  ScenarioSchema,
  TrackSchema,
  type ContentIndex,
  type Heading,
  type Lesson,
  type LessonMeta,
  type SearchDoc,
} from '../src/lib/content/schema.ts';
import { isBalanced, totals } from '../src/lib/journal/balance.ts';
import { parseShiwake } from '../src/lib/journal/parse.ts';

export interface BuildResult {
  /** 出力するファイル（public からの相対パス → 中身） */
  files: Map<string, string>;
  errors: string[];
  /** 読み込んだファイル（dev サーバーの監視用） */
  sources: string[];
}

function listFiles(dir: string, ext: string): string[] {
  let out: string[] = [];
  let names: string[];
  try {
    names = readdirSync(dir).sort();
  } catch {
    return out;
  }
  for (const name of names) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(listFiles(p, ext));
    else if (name.endsWith(ext)) out.push(p);
  }
  return out;
}

function formatZod(e: z.ZodError): string {
  return e.issues.map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`).join('; ');
}

/** 本文から ``` で囲まれたブロックを探す */
const FENCE_RE = /^```([\w-]+)?[^\n]*\n([\s\S]*?)^```[ \t]*$/gm;

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
function plainText(body: string): string {
  return body
    .replace(/^```quiz[\s\S]*?^```$/gm, '')
    .replace(/[#>*_`|[\]()-]/g, ' ')
    .replace(/\[!\w+\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildContent(root: string): BuildResult {
  const contentDir = path.join(root, 'content');
  const files = new Map<string, string>();
  const errors: string[] = [];
  const sources: string[] = [];
  const rel = (p: string) => path.relative(root, p);

  const readYaml = (p: string): unknown => {
    sources.push(p);
    try {
      return parseYaml(readFileSync(p, 'utf8'));
    } catch (e) {
      errors.push(`${rel(p)}: YAML を読めません: ${(e as Error).message}`);
      return undefined;
    }
  };

  // ---- 分野 ----
  const tracksPath = path.join(contentDir, 'tracks.yaml');
  const tracksParsed = z.array(TrackSchema).safeParse(readYaml(tracksPath));
  const tracks = tracksParsed.success ? tracksParsed.data : [];
  if (!tracksParsed.success) errors.push(`${rel(tracksPath)}: ${formatZod(tracksParsed.error)}`);
  const trackIds = new Set(tracks.map((t) => t.id));

  // ---- 勘定科目 ----
  const accountsPath = path.join(contentDir, 'accounts.yaml');
  const accountsParsed = z.array(AccountSchema).safeParse(readYaml(accountsPath));
  const accounts = accountsParsed.success ? accountsParsed.data : [];
  if (!accountsParsed.success)
    errors.push(`${rel(accountsPath)}: ${formatZod(accountsParsed.error)}`);
  {
    const seen = new Set<string>();
    for (const a of accounts) {
      for (const n of [a.name, ...a.aliases]) {
        if (seen.has(n)) errors.push(`${rel(accountsPath)}: 「${n}」が重複しています`);
        seen.add(n);
      }
    }
  }
  const book = new AccountBook(accounts);

  /** 仕訳の書き方を検証する（読めない行・貸借の不一致・知らない科目） */
  const checkShiwake = (text: string, where: string, { allowEmpty = false } = {}) => {
    const { entries, issues } = parseShiwake(text);
    for (const i of issues)
      errors.push(`${where}: ${i.line ? `${i.line} 行目: ` : ''}${i.message}`);
    if (!allowEmpty && entries.length === 0 && issues.length === 0)
      errors.push(`${where}: 仕訳がありません`);
    for (const e of entries) {
      if (!isBalanced(e)) {
        const t = totals(e.lines);
        errors.push(
          `${where}: 貸借が一致していません（借方 ${t.dr.toLocaleString()} / 貸方 ${t.cr.toLocaleString()}）${e.caption ? `「${e.caption}」` : ''}`,
        );
      }
      for (const l of e.lines) {
        if (!book.find(l.account))
          errors.push(`${where}: 勘定科目「${l.account}」が content/accounts.yaml にありません`);
        if (l.amount <= 0) errors.push(`${where}: 金額は正の数で書きます（${l.account}）`);
      }
    }
    return entries;
  };

  for (const a of accounts) {
    a.examples.forEach((ex, i) =>
      checkShiwake(ex, `${rel(accountsPath)}: ${a.name} の例 ${i + 1}`),
    );
    for (const r of a.related) {
      if (!book.find(r))
        errors.push(`${rel(accountsPath)}: ${a.name} の関連科目「${r}」がありません`);
    }
  }

  // ---- 税率など ----
  const rules = [];
  for (const p of listFiles(path.join(contentDir, 'rules'), '.yaml')) {
    const r = RuleSchema.safeParse(readYaml(p));
    if (r.success) rules.push(r.data);
    else errors.push(`${rel(p)}: ${formatZod(r.error)}`);
  }

  const ids = new Set<string>();
  const checkId = (id: string, where: string) => {
    if (ids.has(id)) errors.push(`${where}: id「${id}」が重複しています`);
    ids.add(id);
  };
  const checkTrack = (track: string, where: string) => {
    if (!trackIds.has(track))
      errors.push(`${where}: 分野「${track}」が content/tracks.yaml にありません`);
  };

  /** 問題の正解・選べる科目を確かめる */
  const checkQuestion = (q: { answer: string; accounts?: string[] }, where: string) => {
    const entries = checkShiwake(q.answer, `${where} の正解`);
    if (entries.length > 1) errors.push(`${where}: 正解の仕訳は 1 つにします`);
    for (const name of q.accounts ?? []) {
      if (!book.find(name)) errors.push(`${where}: 選べる科目「${name}」がありません`);
    }
    if (q.accounts && entries[0]) {
      const choices = new Set(q.accounts.map((n) => book.canonical(n)));
      for (const l of entries[0].lines) {
        if (!choices.has(book.canonical(l.account)))
          errors.push(`${where}: 正解の科目「${l.account}」が選べる科目にありません`);
      }
    }
  };

  // ---- レッスン ----
  const lessons: Lesson[] = [];
  for (const p of listFiles(path.join(contentDir, 'lessons'), '.md')) {
    sources.push(p);
    const where = rel(p);
    const raw = readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
    const fm = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
    if (!fm) {
      errors.push(`${where}: 先頭に --- で囲んだ YAML（frontmatter）がありません`);
      continue;
    }
    let data: unknown;
    try {
      data = parseYaml(fm[1]);
    } catch (e) {
      errors.push(`${where}: frontmatter を読めません: ${(e as Error).message}`);
      continue;
    }
    const parsed = LessonFrontmatterSchema.safeParse(data);
    if (!parsed.success) {
      errors.push(`${where}: ${formatZod(parsed.error)}`);
      continue;
    }
    const front = parsed.data;
    checkId(front.id, where);
    checkTrack(front.track, where);

    let quizCount = 0;
    const body = raw
      .slice(fm[0].length)
      .replace(FENCE_RE, (block, lang: string | undefined, code: string) => {
        if (lang === 'shiwake') {
          checkShiwake(code, `${where}（仕訳）`);
          return block;
        }
        if (lang === 'quiz') {
          quizCount++;
          let q: unknown;
          try {
            q = parseYaml(code);
          } catch (e) {
            errors.push(
              `${where}（確認問題 ${quizCount}）: YAML を読めません: ${(e as Error).message}`,
            );
            return block;
          }
          const r = QuizSchema.safeParse(q);
          if (!r.success) {
            errors.push(`${where}（確認問題 ${quizCount}）: ${formatZod(r.error)}`);
            return block;
          }
          if (r.data.type === 'choice' && r.data.answer >= r.data.choices.length)
            errors.push(`${where}（確認問題 ${quizCount}）: answer が選択肢の数を超えています`);
          if (r.data.type === 'shiwake') checkQuestion(r.data, `${where}（確認問題 ${quizCount}）`);
          return '```quiz\n' + JSON.stringify(r.data) + '\n```';
        }
        return block;
      });
    const text = plainText(body);
    const meta: LessonMeta = {
      ...front,
      headings: extractHeadings(body),
      // 日本語は 1 分あたり 500 字ほどを目安にする
      minutes: Math.max(1, Math.round(text.length / 500)),
      quizCount,
    };
    lessons.push({ meta, body });
  }

  // ---- 問題セット ----
  const drills = [];
  for (const p of listFiles(path.join(contentDir, 'drills'), '.yaml')) {
    const where = rel(p);
    const r = DrillSetSchema.safeParse(readYaml(p));
    if (!r.success) {
      errors.push(`${where}: ${formatZod(r.error)}`);
      continue;
    }
    checkId(r.data.id, where);
    checkTrack(r.data.track, where);
    const qids = new Set<string>();
    for (const q of r.data.questions) {
      if (qids.has(q.id)) errors.push(`${where}: 問題の id「${q.id}」が重複しています`);
      qids.add(q.id);
      checkQuestion(q, `${where}（問題 ${q.id}）`);
    }
    drills.push(r.data);
  }

  // ---- 帳簿のサンプル ----
  const scenarios = [];
  for (const p of listFiles(path.join(contentDir, 'scenarios'), '.yaml')) {
    const where = rel(p);
    const r = ScenarioSchema.safeParse(readYaml(p));
    if (!r.success) {
      errors.push(`${where}: ${formatZod(r.error)}`);
      continue;
    }
    checkId(r.data.id, where);
    r.data.entries.forEach((e, i) => {
      const entries = checkShiwake(e.shiwake, `${where}（${i + 1} 件目 ${e.date}）`);
      if (entries.length > 1) errors.push(`${where}（${i + 1} 件目）: 仕訳は 1 つにします`);
    });
    scenarios.push(r.data);
  }

  const byOrder = <T extends { track: string; order: number }>(a: T, b: T) => {
    const ta = tracks.findIndex((t) => t.id === a.track);
    const tb = tracks.findIndex((t) => t.id === b.track);
    return ta - tb || a.order - b.order;
  };
  lessons.sort((a, b) => byOrder(a.meta, b.meta));
  drills.sort(byOrder);

  const index: ContentIndex = {
    version: 1,
    tracks,
    lessons: lessons.map((l) => l.meta),
    drills: drills.map(({ questions, ...meta }) => ({ ...meta, questionCount: questions.length })),
    accounts,
    rules,
    scenarios,
  };
  files.set('content/index.json', JSON.stringify(index));
  for (const l of lessons) files.set(`content/lessons/${l.meta.id}.json`, JSON.stringify(l));
  for (const d of drills) files.set(`content/drills/${d.id}.json`, JSON.stringify(d));

  const search: SearchDoc[] = [
    ...lessons.map((l) => ({
      id: `lesson:${l.meta.id}`,
      kind: 'lesson' as const,
      title: l.meta.title,
      track: l.meta.track,
      text: `${l.meta.summary} ${l.meta.tags.join(' ')} ${plainText(l.body)}`,
    })),
    ...drills.map((d) => ({
      id: `drill:${d.id}`,
      kind: 'drill' as const,
      title: d.title,
      track: d.track,
      text: `${d.summary} ${d.tags.join(' ')} ${d.questions.map((q) => q.question).join(' ')}`,
    })),
    ...accounts.map((a) => ({
      id: `account:${a.name}`,
      kind: 'account' as const,
      title: a.name,
      text: `${a.kana} ${a.aliases.join(' ')} ${a.group} ${a.description} ${a.usage ?? ''}`,
    })),
  ];
  files.set('content/search.json', JSON.stringify(search));

  return { files, errors, sources };
}
