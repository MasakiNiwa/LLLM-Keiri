/**
 * 読み上げ用に、Markdown・仕訳の記号を読みやすい文にする。
 */
export function speechText(markdown: string): string {
  return (
    markdown
      // コードブロック（仕訳・問題など）は読み上げない
      .replace(/^```[\s\S]*?^```$/gm, '')
      .replace(/`([^`]*)`/g, '$1')
      // リンクは文字だけ
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      // 見出し・引用・箇条書き・強調の記号
      .replace(/^#{1,6}\s*/gm, '')
      .replace(/^>\s*\[!\w+\]\s*$/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/\*\*|__|~~/g, '')
      // 表の罫線
      .replace(/^\|?[\s:|-]+\|?$/gm, '')
      .replace(/\|/g, '、')
      // 読みにくい記号
      .replace(/△/g, 'マイナス')
      .replace(/ ＝ | = /g, ' イコール ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim()
  );
}
