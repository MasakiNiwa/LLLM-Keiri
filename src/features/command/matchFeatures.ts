import type { NavItem } from '@/app/navItems';

const norm = (s: string) => s.normalize('NFKC').toLowerCase();

/** 機能を、名前・説明・キーワードで探す（空白で区切った語をすべて含むもの。名前が一致するものを先に） */
export function matchFeatures(items: NavItem[], query: string): NavItem[] {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return items;
  const scored = items
    .map((i) => {
      const label = norm(i.label);
      const text = norm(`${i.label} ${i.description ?? ''} ${i.keywords ?? ''}`);
      if (!words.every((w) => text.includes(w))) return null;
      return { i, score: words.every((w) => label.includes(w)) ? 0 : 1 };
    })
    .filter((x): x is { i: NavItem; score: number } => !!x);
  return scored.sort((a, b) => a.score - b.score).map((x) => x.i);
}
