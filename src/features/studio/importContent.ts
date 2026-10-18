/**
 * 外部 AI が返したデータ（レッスンの Markdown・問題セットの JSON / YAML）を読み取り、
 * ビルド時と同じ検証（形式・仕訳の貸借・勘定科目）をしてから取り込む。
 */
import { parse as parseYaml } from 'yaml';
import { AccountBook } from '@/lib/content/accounts';
import {
  compileConsolidation,
  compileDrill,
  compileLesson,
  ContentChecker,
} from '@/lib/content/compile';
import type { ConsolidationCase, ContentIndex, DrillSet, Lesson } from '@/lib/content/schema';

export type ParsedContent =
  | { kind: 'lesson'; lesson: Lesson }
  | { kind: 'drill'; drill: DrillSet }
  | { kind: 'consolidation'; consolidation: ConsolidationCase };

export interface ImportResult {
  content?: ParsedContent;
  errors: string[];
  /** 直したこと（id の接頭辞・知らない分野など） */
  notes: string[];
}

/** マイ教材の id の接頭辞（サイトの教材と重ならないように） */
export const USER_ID_PREFIX = 'my-';

/**
 * 返答の本文を取り出す。全体が ``` で囲まれていたり、説明の後ろにコードブロックがあったりしても読む。
 */
export function extractPayload(text: string): string {
  const t = text.replace(/\r\n/g, '\n').trim();
  if (t.startsWith('---') || t.startsWith('{')) return t;
  // 外側のコードブロック（中に ``` を含んでもよいよう、最後の ``` までを取る）
  const outer = /^(`{3,})[\w-]*[^\n]*\n([\s\S]*)\n\1\s*$/.exec(t);
  if (outer) return outer[2].trim();
  const block = /(`{3,})(json|ya?ml|markdown|md)[^\n]*\n([\s\S]*?)\n\1/.exec(t);
  if (block) return block[3].trim();
  const fm = t.indexOf('\n---\n');
  if (fm >= 0 && /^---\s*$/m.test(t)) return t.slice(t.indexOf('---')).trim();
  return t;
}

function userId(id: string): string {
  return id.startsWith(USER_ID_PREFIX) ? id : `${USER_ID_PREFIX}${id}`;
}

export function parseImport(text: string, index: ContentIndex): ImportResult {
  const notes: string[] = [];
  const checker = new ContentChecker(new AccountBook(index.accounts));
  const payload = extractPayload(text);
  if (!payload) return { errors: ['取り込む内容が空です'], notes };
  const fixTrack = (track: string): string => {
    if (index.tracks.some((t) => t.id === track)) return track;
    const fallback = index.tracks[0]?.id ?? track;
    notes.push(`分野「${track}」が無いので「${index.tracks[0]?.title ?? fallback}」にしました`);
    return fallback;
  };

  if (payload.startsWith('---')) {
    const lesson = compileLesson(payload, 'レッスン', checker);
    if (!lesson || checker.errors.length) return { errors: checker.errors, notes };
    const id = userId(lesson.meta.id);
    if (id !== lesson.meta.id) notes.push(`id を「${id}」にしました`);
    return {
      content: {
        kind: 'lesson',
        lesson: { ...lesson, meta: { ...lesson.meta, id, track: fixTrack(lesson.meta.track) } },
      },
      errors: [],
      notes,
    };
  }

  let data: unknown;
  try {
    data = parseYaml(payload);
  } catch (e) {
    return {
      errors: [`JSON / YAML として読めません: ${(e as Error).message}`],
      notes,
    };
  }
  if (data && typeof data === 'object' && 'entities' in data) {
    const c = compileConsolidation(data, '連結の事例', checker);
    if (!c || checker.errors.length) return { errors: checker.errors, notes };
    const id = userId(c.id);
    if (id !== c.id) notes.push(`id を「${id}」にしました`);
    return { content: { kind: 'consolidation', consolidation: { ...c, id } }, errors: [], notes };
  }
  if (data && typeof data === 'object' && 'questions' in data) {
    const drill = compileDrill(data, '問題セット', checker);
    if (!drill || checker.errors.length) return { errors: checker.errors, notes };
    const id = userId(drill.id);
    if (id !== drill.id) notes.push(`id を「${id}」にしました`);
    return {
      content: { kind: 'drill', drill: { ...drill, id, track: fixTrack(drill.track) } },
      errors: [],
      notes,
    };
  }
  return {
    errors: [
      'レッスン（--- で始まる Markdown）・問題セット（questions を含む JSON）・連結の事例（entities を含む JSON）として読めません',
    ],
    notes,
  };
}
