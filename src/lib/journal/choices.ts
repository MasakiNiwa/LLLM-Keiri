import type { AccountBook } from '../content/accounts.ts';

/** 間違えやすい組み合わせ（関連科目に加えて、選択肢に混ぜる） */
const CONFUSING: [string, string][] = [
  ['売掛金', '未収入金'],
  ['買掛金', '未払金'],
  ['前払金', '前受金'],
  ['仮払金', '仮受金'],
  ['現金', '当座預金'],
  ['仕入', '売上'],
  ['仮払消費税等', '仮受消費税等'],
  ['前払費用', '未払費用'],
  ['未収収益', '前受収益'],
  ['受取手形', '支払手形'],
  ['貸付金', '借入金'],
  ['立替金', '預り金'],
];

/** 文字列から決まる乱数（同じ問題なら選択肢の並びが毎回同じになる） */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed: string): T[] {
  const rnd = seededRandom(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 仕訳問題で選べる勘定科目を作る。正解の科目に、関連科目・間違えやすい科目・同じ区分の科目を混ぜる。
 * 正解の科目は必ず含める。
 */
export function accountChoices(
  answerAccounts: string[],
  book: AccountBook,
  seed: string,
  count = 8,
): string[] {
  const answer = [...new Set(answerAccounts.map((a) => book.canonical(a)))];
  const picked = new Set(answer);
  const add = (name: string) => {
    const a = book.find(name);
    if (a && picked.size < Math.max(count, answer.length)) picked.add(a.name);
  };
  const rnd = seededRandom(`${seed}:pool`);
  for (const name of answer) {
    for (const [x, y] of CONFUSING) {
      if (x === name) add(y);
      if (y === name) add(x);
    }
  }
  for (const name of answer) for (const r of book.find(name)?.related ?? []) add(r);
  // まだ足りなければ、正解の科目と同じ区分・同じくらいの難しさの科目から
  const sameElement = book.accounts.filter((a) =>
    answer.some((n) => {
      const x = book.find(n);
      return x && a.element === x.element && a.level <= Math.max(2, x.level);
    }),
  );
  for (const a of [...sameElement].sort(() => rnd() - 0.5)) add(a.name);
  return shuffle([...picked], seed);
}
