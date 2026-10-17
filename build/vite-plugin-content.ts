import path from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { buildContent, type BuildResult } from './content.ts';

/**
 * 学習データ（content/）を検証して JSON にし、dev サーバーでは配信、build では dist/content/ に出力する。
 * 検証で問題が見つかったら、build は失敗させ、dev サーバーでは警告を出す。
 */
export function contentPlugin(): Plugin {
  let root = process.cwd();
  let result: BuildResult | null = null;
  const build = () => {
    result = buildContent(root);
    return result;
  };
  const report = (r: BuildResult, server?: ViteDevServer) => {
    if (r.errors.length === 0) return;
    const message = `学習データに ${r.errors.length} 件の問題があります:\n- ${r.errors.join('\n- ')}`;
    if (server) server.config.logger.warn(message);
    else throw new Error(message);
  };
  return {
    name: 'lllm-keiri-content',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      report(build(), server);
      server.watcher.add(path.join(root, 'content'));
      server.watcher.on('all', (_event, file) => {
        if (!file.startsWith(path.join(root, 'content'))) return;
        report(build(), server);
        server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\//, '');
        const body = result?.files.get(url);
        if (body === undefined) return next();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(body);
      });
    },
    buildStart() {
      const r = build();
      report(r);
      for (const s of r.sources) this.addWatchFile(s);
    },
    generateBundle() {
      for (const [fileName, source] of result?.files ?? []) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}
