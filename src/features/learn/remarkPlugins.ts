/**
 * レッスンの Markdown 用の小さな remark プラグイン。
 * - remarkCallouts: `> [!POINT]` などの囲み（GitHub のアラートと同じ書き方）
 * - remarkHeadingIds: h2・h3 に sec-1, sec-2, … の id（目次と対応。build/content.ts の extractHeadings と同じ順）
 */

interface MdNode {
  type: string;
  depth?: number;
  value?: string;
  children?: MdNode[];
  data?: { hProperties?: Record<string, unknown> };
}

export const CALLOUT_TYPES = ['point', 'note', 'tip', 'warning'] as const;
export type CalloutType = (typeof CALLOUT_TYPES)[number];

function walk(node: MdNode, fn: (n: MdNode) => void) {
  fn(node);
  node.children?.forEach((c) => walk(c, fn));
}

export function remarkCallouts() {
  return (tree: MdNode) => {
    walk(tree, (node) => {
      if (node.type !== 'blockquote') return;
      const para = node.children?.[0];
      const text = para?.type === 'paragraph' ? para.children?.[0] : undefined;
      if (text?.type !== 'text' || !text.value) return;
      const m = /^\[!(\w+)\][ \t]*\n?/.exec(text.value);
      if (!m) return;
      const type = m[1].toLowerCase();
      if (!(CALLOUT_TYPES as readonly string[]).includes(type)) return;
      text.value = text.value.slice(m[0].length);
      // 印だけの行（後ろが改行）なら、空になったテキストと続く改行を除く
      if (text.value === '' && para?.children) {
        para.children.shift();
        if (para.children[0]?.type === 'break') para.children.shift();
      }
      node.data = { ...node.data, hProperties: { 'data-callout': type } };
    });
  };
}

/**
 * 日本語の文中の改行を取り除く。Markdown の段落内の改行はブラウザで空白になり、
 * 「〜です。 次の〜」のように不自然なすき間ができるため（英数字どうしの改行は空白のまま残す）。
 */
export function remarkCjkNewlines() {
  return (tree: MdNode) => {
    walk(tree, (node) => {
      if (node.type === 'text' && node.value?.includes('\n')) {
        node.value = node.value.replace(/(?<=\P{ASCII})\n|\n(?=\P{ASCII})/gu, '');
      }
    });
  };
}

export function remarkHeadingIds() {
  return (tree: MdNode) => {
    let n = 0;
    walk(tree, (node) => {
      if (node.type === 'heading' && (node.depth === 2 || node.depth === 3)) {
        n++;
        node.data = { ...node.data, hProperties: { id: `sec-${n}` } };
      }
    });
  };
}
