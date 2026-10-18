/**
 * 学習データ（content/）を検証する（CI 用）。
 * 使い方: node scripts/check-content.ts
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContent } from '../build/content.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { files, errors } = buildContent(root);
if (errors.length > 0) {
  console.error(`学習データに ${errors.length} 件の問題があります:`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
const index = JSON.parse(files.get('content/index.json')!);
console.log(
  `学習データ OK: 分野 ${index.tracks.length}・レッスン ${index.lessons.length}・問題セット ${index.drills.length}・選択問題 ${index.quizzes.length}・勘定科目 ${index.accounts.length}・用語 ${index.glossary.length}・ルール ${index.rules.length}`,
);
