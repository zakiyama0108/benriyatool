# タスク: サイトのハブ化

> TDDで進める。各機能ごとに 🔴 Red → 🟢 Green → 🔵 Refactor のサイクルを完結させる。

## ステータス: 完了（PR #17）

- [x] Task 1: 計算機を /ikukyu に移動
  - [x] `app/ikukyu/` フォルダを作成し、`app/page.tsx` を `app/ikukyu/page.tsx` として移動
  - [x] `app/ikukyu/layout.tsx` で `/ikukyu` 専用メタ情報を追加

- [x] Task 2: ハブトップページを新規作成
  - [x] サイト名を「ikukyu」に決定
  - [x] 新しい `app/page.tsx` にハブページを実装（ツールカード形式）
  - [x] `/` 専用の `export const metadata` を追加
  - [x] `app/layout.tsx` のグローバル metadata をハブ用に更新

- [x] Task 3: 内部リンクの更新
  - [x] `app/components/Footer.tsx`: 著作権表記を「ikukyu」に変更
  - [x] `app/legal/page.tsx`: `← シミュレーターへ` のリンクを `/ikukyu` に変更

- [x] Task 4: 動作確認
  - [x] 全テスト通過（61件）
  - [x] ビルド成功・ルート `/`, `/ikukyu`, `/legal` が生成されることを確認
  - [x] Vercel デプロイ成功

## Google検索のサイト名対応（2026-07-17）

- [ ] Task 5: WebSite構造化データ(JSON-LD)の追加
  - [ ] 🔴 Red: `__tests__/components/WebSiteJsonLd.test.tsx`に、`WebSite`スキーマ(name「べんりやつーる」・url)のJSON-LD `<script>`を描画することを検証するテストを書く(仕様コメント: `specs/hub-site/requirements.md#機能要件-1`)
  - [ ] 🟢 Green: `app/components/WebSiteJsonLd.tsx`を新規作成し(素の`<script type="application/ld+json">`、XSS対策としてNext.jsのJSON-LDガイドに従い`JSON.stringify`後に `<` をユニコード等価の `\u003c` に置換)、トップページ`app/page.tsx`から描画する
  - [ ] 🔵 Refactor: サイト名・URLの定数を`app/layout.tsx`のmetadataと重複しないよう整理する
  - [ ] requirements.md先頭の「仕様確認中」マーカーを削除し、`npm run check:spec-coverage`で機能要件[1]とテストの対応を確認する(機能要件に`[1]`が付いたことで`scripts/spec-coverage-skip.json`の既存エントリ「機能要件」は未使用になるため、あわせて削除または見直しを行う)

- [ ] Task 6: 動作確認(リリース前後)
  - [ ] ビルド成功・トップページのHTMLにJSON-LDが出力されることを確認
  - [ ] schema.orgバリデータ(validator.schema.org)での検証
  - [ ] リリース後、Google Search Consoleでトップページと`/ikukyu`の再クロールをリクエストする(手動・運営者作業)
