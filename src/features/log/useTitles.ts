import { useMemo } from 'react';
import { useContentIndex } from '@/features/content/contentStore';
import { useUserContent } from '@/features/studio/userContentRepo';

/** id から表示名を引く（レッスン・問題セット・演習・マイ教材） */
export function useTitles() {
  const { index } = useContentIndex();
  const mine = useUserContent();
  return useMemo(() => {
    const m = new Map<string, { title: string; href: string }>();
    for (const l of index?.lessons ?? []) {
      m.set(l.id, { title: l.title, href: `/learn/${l.id}` });
      m.set(`lesson:${l.id}`, { title: `${l.title}（確認問題）`, href: `/learn/${l.id}` });
    }
    for (const d of index?.drills ?? []) m.set(d.id, { title: d.title, href: `/drill/${d.id}` });
    for (const q of index?.quizzes ?? [])
      m.set(`quiz:${q.id}`, { title: q.title, href: `/quiz/${q.id}` });
    for (const e of index?.exercises ?? [])
      m.set(`exercise:${e.id}`, {
        title: `決算の総合演習「${e.title}」`,
        href: `/exercise/${e.id}`,
      });
    for (const c of mine ?? [])
      m.set(c.id, {
        title: `${c.title}（マイ教材）`,
        href: c.kind === 'lesson' ? `/learn/${c.id}` : `/drill/${c.id}`,
      });
    return m;
  }, [index, mine]);
}
