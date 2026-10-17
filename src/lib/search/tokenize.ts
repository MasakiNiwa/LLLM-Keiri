/**
 * 検索用の分かち書き。日本語は形態素解析をせず、2 文字ずつの重なり（2-gram）で区切る。
 * 英数字は単語のまま。辞書がいらず軽いので、Web Worker の中でも手軽に使える。
 */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々〆]/u;

export function tokenize(text: string): string[] {
  const s = text.normalize('NFKC').toLowerCase();
  const tokens: string[] = [];
  let run = '';
  let word = '';
  const flushRun = () => {
    if (run.length === 1) tokens.push(run);
    for (let i = 0; i + 1 < run.length; i++) tokens.push(run.slice(i, i + 2));
    run = '';
  };
  const flushWord = () => {
    if (word) tokens.push(word);
    word = '';
  };
  for (const ch of s) {
    if (CJK.test(ch)) {
      flushWord();
      run += ch;
    } else if (/[\p{L}\p{N}]/u.test(ch)) {
      flushRun();
      word += ch;
    } else {
      flushRun();
      flushWord();
    }
  }
  flushRun();
  flushWord();
  return tokens;
}
