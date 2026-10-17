/**
 * 学習データの形式の文書（docs/CONTENT_FORMAT.md）を作る。
 * 使い方: node scripts/build-docs.ts          # 作る
 *         node scripts/build-docs.ts --check  # 最新か確かめる（CI 用）
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContent } from '../build/content.ts';
import type { ContentIndex } from '../src/lib/content/schema.ts';
import { contentFormatDoc } from '../src/lib/content/spec.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { files } = buildContent(root);
const index = JSON.parse(files.get('content/index.json')!) as ContentIndex;
const doc = contentFormatDoc(index.tracks, index.accounts);
const out = path.join(root, 'docs', 'CONTENT_FORMAT.md');

if (process.argv.includes('--check')) {
  const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
  if (current !== doc) {
    console.error('docs/CONTENT_FORMAT.md is out of date. Run `npm run docs` and commit it.');
    process.exit(1);
  }
  console.log('docs/CONTENT_FORMAT.md is up to date.');
} else {
  writeFileSync(out, doc);
  console.log('Wrote docs/CONTENT_FORMAT.md');
}
