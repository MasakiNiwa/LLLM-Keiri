import { parseAmount } from './amount.ts';
import type { JournalEntry, JournalLine, Side } from './types.ts';

export interface ParseIssue {
  /** 1 から始まる行番号（ブロックの中の行） */
  line: number;
  message: string;
}

export interface ParseResult {
  entries: JournalEntry[];
  issues: ParseIssue[];
}

/**
 * 仕訳の書き方（` ```shiwake ` ブロック）を読む。
 *
 * ```
 * # 商品 100,000 円を掛けで仕入れた
 * 仕入 100,000 / 買掛金 100,000
 * 仮払消費税等 10,000 / 買掛金 10,000
 *
 * # 次の取引（空行で区切ると別の仕訳）
 * 現金 50,000 /
 *            / 売上 50,000
 * ```
 *
 * - 1 行は「借方科目 金額 / 貸方科目 金額」。片側だけの行も書ける
 * - 区切りは「/」「／」。科目と金額のあいだは空白（全角も可）
 * - `#` で始まる行は、その仕訳の説明（caption）
 */
export function parseShiwake(text: string): ParseResult {
  const entries: JournalEntry[] = [];
  const issues: ParseIssue[] = [];
  let current: JournalEntry | null = null;

  const flush = () => {
    if (current && current.lines.length > 0) entries.push(current);
    else if (current?.caption) {
      issues.push({ line: 0, message: `「${current.caption}」に仕訳の行がありません` });
    }
    current = null;
  };

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const lineNo = i + 1;
    const line = rawLine.trim();
    if (line === '') {
      flush();
      return;
    }
    if (line.startsWith('#')) {
      flush();
      current = { caption: line.replace(/^#+\s*/, ''), lines: [] };
      return;
    }
    current ??= { lines: [] };
    const parts = line.split(/[/／]/);
    if (parts.length !== 2) {
      issues.push({
        line: lineNo,
        message: '「借方 / 貸方」の形で、「/」を 1 つだけ書いてください',
      });
      return;
    }
    const sides: Side[] = ['dr', 'cr'];
    parts.forEach((part, k) => {
      const t = part.trim();
      if (t === '') return;
      const parsed = parseSideText(t);
      if ('error' in parsed) {
        issues.push({ line: lineNo, message: parsed.error });
        return;
      }
      current!.lines.push({ side: sides[k], ...parsed });
    });
  });
  flush();
  return { entries, issues };
}

/** 「売掛金 100,000」を科目と金額に分ける */
export function parseSideText(t: string): Omit<JournalLine, 'side'> | { error: string } {
  const m = /^(.+?)[\s\u3000]+([-−△▲]?[¥￥]?[\d０-９,，.．万千億]+円?)$/.exec(t.trim());
  if (!m) return { error: `「${t}」を「科目 金額」として読めません` };
  const account = m[1].trim();
  const amount = parseAmount(m[2]);
  if (amount === null) return { error: `「${m[2]}」を金額として読めません` };
  return { account, amount };
}

/** 仕訳を書き方の文字列に戻す（借方と貸方を行ごとに並べる） */
export function formatShiwake(entry: JournalEntry): string {
  const dr = entry.lines.filter((l) => l.side === 'dr');
  const cr = entry.lines.filter((l) => l.side === 'cr');
  const rows: string[] = [];
  if (entry.caption) rows.push(`# ${entry.caption}`);
  for (let i = 0; i < Math.max(dr.length, cr.length); i++) {
    const left = dr[i] ? `${dr[i].account} ${dr[i].amount.toLocaleString('ja-JP')}` : '';
    const right = cr[i] ? `${cr[i].account} ${cr[i].amount.toLocaleString('ja-JP')}` : '';
    rows.push(`${left} / ${right}`.trim());
  }
  return rows.join('\n');
}
