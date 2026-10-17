/** 本文から、見出しの名前を含む節（次の同じ深さ以上の見出しまで）を取り出す */
export function sectionText(body: string, heading: string): string | undefined {
  const lines = body.split('\n');
  let start = -1;
  let depth = 0;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('```')) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+)$/.exec(lines[i]);
    if (!m) continue;
    if (start >= 0 && m[1].length <= depth) return lines.slice(start, i).join('\n');
    if (start < 0 && m[2].includes(heading)) {
      start = i;
      depth = m[1].length;
    }
  }
  return start >= 0 ? lines.slice(start).join('\n') : undefined;
}

/** AI に渡す本文（確認問題の JSON を除き、長いときは途中まで） */
export function excerptForAi(markdown: string, max = 1500): string {
  const text = markdown.replace(/```quiz[\s\S]*?```/g, '').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
