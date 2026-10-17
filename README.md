# LLLM 経理（LLLM-Keiri）

**日本の経理を学ぶための、ローカル LLM 付き学習サイト**

簿記の基本から、日々の経理・決算・税務・会計基準までを、仕訳を動かしながら学べます。
仕訳の正誤・貸借の一致・帳簿の集計はプログラムが正確に行い、その上にブラウザの中で動くローカル AI（Gemma 4 など）が
解説・リアクション・質問への回答で乗っています。

🌐 **公開ページ**: https://masakiniwa.github.io/LLLM-Keiri/

> 現在は初期版です。[ロードマップ](docs/SPEC.md#ロードマップ)に沿って、フェーズごとに機能を追加しています。

## 特長（予定を含む）

- 📚 **学びたいことを直感的に** — 分野ごとのレッスンと全文検索。仕訳は教科書と同じ「借方 / 貸方」の形で表示
- 🔁 **会計基準・税制の改正に追従** — 学習内容はコードから分けたデータ（Markdown / YAML）。根拠と基準日を表示
- ✍️ **インタラクティブ** — 仕訳問題をプログラムがその場で採点。自分で入れた仕訳から元帳・試算表・決算書ができあがる
- 🤖 **ローカル AI** — 見ている内容をフロートで解説、操作へのリアクション、チャットで質問。性格タイプを選べる
- 🧩 **AI に全部を任せない設計** — 判定・集計はプログラム、AI はその上に。アプリの状態は構造化データで AI に渡す
- 🔗 **外部 AI との連携** — プロンプトを作って外部の AI に教材を作ってもらい、取り込める
- 💾 **モデルの共有とバックアップ** — ダウンロードした AI モデルは同じ github.io の他のサイトと共有。端末にも書き出せる
- 🌙 **落ち着いたダークモード**・📱 **スマホ / PC 両対応・PWA**

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm run build      # 本番ビルド（dist/）
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest
npm run format     # Prettier
npm run licenses   # サードパーティのライセンス一覧の生成
npm run content:check  # 学習データ（content/）の検証
```

### 学習データを追加・更新するには

学習内容はコードから分けて `content/` に置いています（会計基準・税制の改正があっても、データを直すだけで更新できます）。

| ファイル                      | 内容                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| `content/tracks.yaml`         | 分野の一覧と表示順                                           |
| `content/lessons/<分野>/*.md` | レッスン（先頭に YAML。根拠 `basis` と基準日 `asOf` を書く） |
| `content/accounts.yaml`       | 勘定科目のマスタ                                             |
| `content/rules/*.yaml`        | 税率など、適用期間つきの値                                   |

レッスンの中では ` ```shiwake `（仕訳）・` ```quiz `（確認問題）・`> [!POINT]` などの囲みが使えます（[仕様書](docs/SPEC.md#レッスンの書き方markdown-の拡張)）。
ビルド時に形式・仕訳の貸借の一致・勘定科目の存在をプログラムで確かめます（`npm run content:check`）。

`main` ブランチへの push で GitHub Actions が GitHub Pages にデプロイします
（リポジトリの Settings → Pages → Source を **GitHub Actions** にしてください）。

## ドキュメント

- [仕様書・ロードマップ](docs/SPEC.md)
- [共通モデル保存仕様](docs/SHARED_MODEL_STORAGE.md)（github.io のサイト間で AI モデルを共有する取り決め）

## 技術スタック

| 分野          | 採用技術                                  |
| ------------- | ----------------------------------------- |
| ビルド        | Vite, TypeScript                          |
| UI            | React, Tailwind CSS, lucide-react, sonner |
| 状態管理      | Zustand                                   |
| ルーティング  | wouter（ハッシュルーティング）            |
| データ        | Dexie（IndexedDB）, zod                   |
| PWA           | vite-plugin-pwa（Workbox）                |
| テスト / 品質 | Vitest, ESLint, Prettier                  |

ローカル AI（LiteRT-LM）などは、各フェーズで追加します。

## ライセンス

[MIT License](LICENSE)

利用しているサードパーティ製ソフトウェアの一覧は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
（ライセンス全文はアプリのヘルプ画面）を参照してください。
AI モデルは本リポジトリに含まれず、各モデルのライセンス・利用規約が適用されます。
