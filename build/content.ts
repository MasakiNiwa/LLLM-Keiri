/**
 * 学習データ（content/）を読み込み、検証して、アプリが fetch する JSON にする。
 *
 * - レッスン: Markdown（先頭に YAML の frontmatter）。` ```shiwake ` は貸借の一致と勘定科目を確かめ、
 *   ` ```quiz ` は YAML を検証して JSON に置き換える
 * - 勘定科目・分野・税率など・問題セット: YAML
 *
 * Vite のプラグイン（vite-plugin-content.ts）と、CI の検証（scripts/check-content.ts）から使う。
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { AccountBook } from '../src/lib/content/accounts.ts';
import {
  compileConsolidation,
  compileDrill,
  compileExercise,
  compileQuizSet,
  compileLesson,
  compileScenario,
  ContentChecker,
  formatZod,
  plainText,
} from '../src/lib/content/compile.ts';
import {
  AccountSchema,
  GlossaryTermSchema,
  RuleSchema,
  TrackSchema,
  type ClosingExercise,
  type QuizSet,
  type ConsolidationCase,
  type ContentIndex,
  type DrillSet,
  type Lesson,
  type Scenario,
  type SearchDoc,
} from '../src/lib/content/schema.ts';

export { extractHeadings } from '../src/lib/content/compile.ts';

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

  const checker = new ContentChecker(book, errors);

  for (const a of accounts) {
    a.examples.forEach((ex, i) =>
      checker.checkShiwake(ex, `${rel(accountsPath)}: ${a.name} の例 ${i + 1}`),
    );
    for (const r of a.related) {
      if (!book.find(r))
        errors.push(`${rel(accountsPath)}: ${a.name} の関連科目「${r}」がありません`);
    }
  }

  // ---- 税率など ----
  // 用語集（勘定科目と名前が重ならないこと、関連・レッスンが存在すること）
  const glossaryPath = path.join(contentDir, 'glossary.yaml');
  const glossaryParsed = z
    .array(GlossaryTermSchema)
    .safeParse(existsSync(glossaryPath) ? readYaml(glossaryPath) : []);
  const glossary = glossaryParsed.success ? glossaryParsed.data : [];
  if (!glossaryParsed.success)
    errors.push(`${rel(glossaryPath)}: ${formatZod(glossaryParsed.error)}`);
  {
    const seen = new Set<string>();
    for (const g of glossary) {
      for (const n of [g.term, ...g.aliases]) {
        if (seen.has(n)) errors.push(`${rel(glossaryPath)}: 「${n}」が重複しています`);
        if (book.find(n)) errors.push(`${rel(glossaryPath)}: 「${n}」は勘定科目と同じ名前です`);
        seen.add(n);
      }
    }
  }

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

  // ---- レッスン ----
  const lessons: Lesson[] = [];
  for (const p of listFiles(path.join(contentDir, 'lessons'), '.md')) {
    sources.push(p);
    const where = rel(p);
    const lesson = compileLesson(readFileSync(p, 'utf8'), where, checker);
    if (!lesson) continue;
    checkId(lesson.meta.id, where);
    checkTrack(lesson.meta.track, where);
    lessons.push(lesson);
  }

  // ---- 問題セット ----
  const drills: DrillSet[] = [];
  for (const p of listFiles(path.join(contentDir, 'drills'), '.yaml')) {
    const where = rel(p);
    const drill = compileDrill(readYaml(p), where, checker);
    if (!drill) continue;
    checkId(drill.id, where);
    checkTrack(drill.track, where);
    drills.push(drill);
  }

  // ---- 選択問題のセット ----
  const quizzes: QuizSet[] = [];
  for (const p of listFiles(path.join(contentDir, 'quizzes'), '.yaml')) {
    const where = rel(p);
    const q = compileQuizSet(readYaml(p), where, checker);
    if (!q) continue;
    checkId(q.id, where);
    checkTrack(q.track, where);
    quizzes.push(q);
  }

  // ---- 帳簿のサンプル ----
  const scenarios: Scenario[] = [];
  for (const p of listFiles(path.join(contentDir, 'scenarios'), '.yaml')) {
    const where = rel(p);
    const scenario = compileScenario(readYaml(p), where, checker);
    if (!scenario) continue;
    checkId(scenario.id, where);
    scenarios.push(scenario);
  }

  // ---- 連結の事例 ----
  const consolidations: ConsolidationCase[] = [];
  for (const p of listFiles(path.join(contentDir, 'consolidation'), '.yaml')) {
    const where = rel(p);
    const c = compileConsolidation(readYaml(p), where, checker);
    if (!c) continue;
    checkId(c.id, where);
    consolidations.push(c);
  }
  consolidations.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));

  // ---- 決算の総合演習 ----
  const exercises: ClosingExercise[] = [];
  for (const p of listFiles(path.join(contentDir, 'exercises'), '.yaml')) {
    const where = rel(p);
    const ex = compileExercise(readYaml(p), where, checker);
    if (!ex) continue;
    checkId(ex.id, where);
    exercises.push(ex);
  }
  exercises.sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));

  // 用語集の関連・レッスンが存在するか
  {
    const terms = new Set(glossary.map((g) => g.term));
    const lessonIds = new Set(lessons.map((l) => l.meta.id));
    for (const g of glossary) {
      for (const r of g.related)
        if (!terms.has(r) && !book.find(r))
          errors.push(
            `${rel(glossaryPath)}: ${g.term} の関連「${r}」が用語集にも勘定科目にもありません`,
          );
      for (const id of g.lessons)
        if (!lessonIds.has(id))
          errors.push(`${rel(glossaryPath)}: ${g.term} のレッスン「${id}」がありません`);
    }
  }

  const byOrder = <T extends { track: string; order: number }>(a: T, b: T) => {
    const ta = tracks.findIndex((t) => t.id === a.track);
    const tb = tracks.findIndex((t) => t.id === b.track);
    return ta - tb || a.order - b.order;
  };
  lessons.sort((a, b) => byOrder(a.meta, b.meta));
  drills.sort(byOrder);
  quizzes.sort(byOrder);

  const index: ContentIndex = {
    version: 1,
    tracks,
    lessons: lessons.map((l) => l.meta),
    drills: drills.map(({ questions, ...meta }) => ({ ...meta, questionCount: questions.length })),
    accounts,
    glossary,
    rules,
    scenarios,
    consolidations: consolidations.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      level: c.level,
      asOf: c.asOf,
      lessons: c.lessons,
      entities: c.entities.map((e) => ({ name: e.name, currency: e.currency })),
      eliminationCount: c.eliminations.length,
    })),
    quizzes: quizzes.map(({ questions, ...meta }) => ({
      ...meta,
      questionCount: questions.length,
    })),
    exercises: exercises.map((e) => ({
      id: e.id,
      kind: e.kind,
      title: e.title,
      summary: e.summary,
      level: e.level,
      adjustmentCount: e.adjustments.length,
    })),
  };
  files.set('content/index.json', JSON.stringify(index));
  for (const l of lessons) files.set(`content/lessons/${l.meta.id}.json`, JSON.stringify(l));
  for (const d of drills) files.set(`content/drills/${d.id}.json`, JSON.stringify(d));
  for (const c of consolidations)
    files.set(`content/consolidation/${c.id}.json`, JSON.stringify(c));
  for (const e of exercises) files.set(`content/exercises/${e.id}.json`, JSON.stringify(e));
  for (const q of quizzes) files.set(`content/quizzes/${q.id}.json`, JSON.stringify(q));

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
    ...quizzes.map((q) => ({
      id: `quiz:${q.id}`,
      kind: 'quiz' as const,
      title: q.title,
      track: q.track,
      text: `${q.summary} ${q.tags.join(' ')} ${q.questions.map((x) => `${x.context ?? ''} ${x.question}`).join(' ')}`,
    })),
    ...accounts.map((a) => ({
      id: `account:${a.name}`,
      kind: 'account' as const,
      title: a.name,
      text: `${a.kana} ${a.aliases.join(' ')} ${a.group} ${a.description} ${a.usage ?? ''}`,
    })),
    ...glossary.map((g) => ({
      id: `term:${g.term}`,
      kind: 'term' as const,
      title: g.term,
      text: `${g.kana} ${g.aliases.join(' ')} ${g.description}`,
    })),
  ];
  files.set('content/search.json', JSON.stringify(search));

  return { files, errors, sources };
}
