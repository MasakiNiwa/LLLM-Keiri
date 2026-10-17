/** 難しさの表示名 */
export const LEVEL_LABELS: Record<number, string> = {
  1: '入門',
  2: '基礎',
  3: '標準',
  4: '応用',
  5: '発展',
};

/** YYYY-MM-DD を「2026年10月1日」にする */
export function formatDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return `${y}年${m}月${day}日`;
}
