/**
 * 金額の文字列を整数（円）にする。
 * 「100,000」「１００，０００」「100000円」「¥100,000」「10万」「1万2,000」「3千」に対応する。
 * 読めないときは null。
 */
export function parseAmount(raw: string): number | null {
  let s = raw
    .normalize('NFKC')
    .replace(/[\s,，、]/g, '')
    .replace(/^[¥￥]/, '')
    .replace(/円$/, '');
  if (s === '') return null;
  const negative = /^[-−△▲]/.test(s);
  if (negative) s = s.slice(1);
  if (/^\d+$/.test(s)) return withSign(Number(s), negative);

  // 単位（億・万・千）を含む書き方
  const m = /^(?:(\d+(?:\.\d+)?)億)?(?:(\d+(?:\.\d+)?)万)?(?:(\d+(?:\.\d+)?)千)?(\d+)?$/.exec(s);
  if (!m || m[0] === '') return null;
  const [, oku, man, sen, rest] = m;
  const value =
    Number(oku ?? 0) * 1e8 + Number(man ?? 0) * 1e4 + Number(sen ?? 0) * 1e3 + Number(rest ?? 0);
  if (!Number.isFinite(value) || !Number.isInteger(Math.round(value * 1e6) / 1e6)) return null;
  return withSign(Math.round(value), negative);
}

function withSign(n: number, negative: boolean): number | null {
  if (!Number.isSafeInteger(n)) return null;
  return negative ? -n : n;
}

/** 金額をカンマ区切りで表示する（例: 100000 → "100,000"） */
export function formatAmount(n: number): string {
  return n.toLocaleString('ja-JP');
}
