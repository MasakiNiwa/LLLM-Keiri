import { useLiveQuery } from 'dexie-react-hooks';
import { fetchConsolidation, fetchDrill, fetchLesson } from '@/lib/content/load';
import type { ConsolidationCase, DrillSet, Lesson } from '@/lib/content/schema';
import { db, type UserContent } from '@/lib/db/db';
import { USER_ID_PREFIX, type ParsedContent } from './importContent';

/** マイ教材（新しい順） */
export function useUserContent(): UserContent[] | undefined {
  return useLiveQuery(() => db.userContent.orderBy('createdAt').reverse().toArray(), []);
}

/** 取り込んだ教材を保存する（同じ id があれば置き換える）。置き換えたら true */
export async function saveUserContent(c: ParsedContent): Promise<boolean> {
  const createdAt = Date.now();
  const record: UserContent =
    c.kind === 'lesson'
      ? {
          id: c.lesson.meta.id,
          kind: 'lesson',
          title: c.lesson.meta.title,
          data: c.lesson,
          createdAt,
        }
      : c.kind === 'drill'
        ? { id: c.drill.id, kind: 'drill', title: c.drill.title, data: c.drill, createdAt }
        : {
            id: c.consolidation.id,
            kind: 'consolidation',
            title: c.consolidation.title,
            data: c.consolidation,
            createdAt,
          };
  const existed = !!(await db.userContent.get(record.id));
  await db.userContent.put(record);
  return existed;
}

export async function deleteUserContent(id: string): Promise<void> {
  await db.userContent.delete(id);
}

export function isUserContentId(id: string): boolean {
  return id.startsWith(USER_ID_PREFIX);
}

/** レッスンを読む（マイ教材ならこの端末から、そうでなければサイトから） */
export async function loadLesson(id: string): Promise<Lesson> {
  if (isUserContentId(id)) {
    const c = await db.userContent.get(id);
    if (c?.kind === 'lesson') return c.data;
    throw new Error('マイ教材にこのレッスンがありません');
  }
  return fetchLesson(id);
}

/** 問題セットを読む（マイ教材ならこの端末から） */
export async function loadDrill(id: string): Promise<DrillSet> {
  if (isUserContentId(id)) {
    const c = await db.userContent.get(id);
    if (c?.kind === 'drill') return c.data;
    throw new Error('マイ教材にこの問題セットがありません');
  }
  return fetchDrill(id);
}

/** 連結の事例を読む（マイ教材ならこの端末から） */
export async function loadConsolidation(id: string): Promise<ConsolidationCase> {
  if (isUserContentId(id)) {
    const c = await db.userContent.get(id);
    if (c?.kind === 'consolidation') return c.data;
    throw new Error('マイ教材にこの連結の事例がありません');
  }
  return fetchConsolidation(id);
}

/** マイ教材を開くページ */
export function userContentHref(c: UserContent): string {
  return c.kind === 'lesson'
    ? `/learn/${c.id}`
    : c.kind === 'drill'
      ? `/drill/${c.id}`
      : `/consolidation/${c.id}`;
}

/** 取り込める形のファイルにする（書き出し・ほかの端末への移動用） */
export function exportUserContent(c: UserContent): { name: string; text: string; type: string } {
  if (c.kind === 'drill' || c.kind === 'consolidation') {
    return {
      name: `${c.id}.json`,
      text: JSON.stringify(c.data, null, 2),
      type: 'application/json',
    };
  }
  const { meta, body } = c.data;
  const front = {
    id: meta.id,
    title: meta.title,
    track: meta.track,
    order: meta.order,
    level: meta.level,
    summary: meta.summary,
    tags: meta.tags,
    basis: meta.basis,
    asOf: meta.asOf,
    updated: meta.updated,
  };
  // 確認問題は JSON に変換済みだが、JSON は YAML としても読めるのでそのまま取り込み直せる
  const yamlFront = Object.entries(front)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n');
  return { name: `${c.id}.md`, text: `---\n${yamlFront}\n---\n${body}`, type: 'text/markdown' };
}
