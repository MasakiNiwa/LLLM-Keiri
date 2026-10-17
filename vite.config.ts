import { readFileSync } from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

const appPkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// https://vite.dev/config/
export default defineConfig({
  // 相対 base: GitHub Pages のサブパス（/LLLM-Keiri/）でもフォークでもそのまま動く
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 生成中・ダウンロード中に勝手にリロードしないよう、更新はユーザーが選ぶ
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        // アプリを見分ける ID（変えると別のアプリとして扱われるので、今後は変えない）
        id: 'lllm-keiri',
        name: 'LLLM 経理',
        short_name: 'LLLM 経理',
        description: '日本の経理を学ぶためのローカルLLM付き学習サイト',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#0f766e',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // ライセンス一覧（更新されうるので裏で取り直す）
            urlPattern: ({ url }) => url.pathname.endsWith('/licenses.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'app-data', expiration: { maxEntries: 100 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  define: {
    __APP_VERSION__: JSON.stringify(appPkg.version),
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts', 'build/**/*.test.ts'],
  },
});
