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

- [x] Task 5: WebSite構造化データ(JSON-LD)の追加
  - [x] 🔴 Red: `__tests__/components/WebSiteJsonLd.test.tsx`に、`WebSite`スキーマ(name「べんりやつーる」・url)のJSON-LD `<script>`を描画することを検証するテストを書く(仕様コメント: `specs/hub-site/requirements.md#機能要件-1`)
  - [x] 🟢 Green: `app/components/WebSiteJsonLd.tsx`を新規作成し(素の`<script type="application/ld+json">`、XSS対策としてNext.jsのJSON-LDガイドに従い`JSON.stringify`後に `<` をユニコード等価の `\u003c` に置換)、トップページ`app/page.tsx`から描画する
  - [x] 🔵 Refactor: サイト名・URLの定数を`app/layout.tsx`のmetadataと重複しないよう整理する
  - [x] requirements.md先頭の「仕様確認中」マーカーを削除し、`npm run check:spec-coverage`で機能要件[1]とテストの対応を確認する(機能要件に`[1]`が付いたことで`scripts/spec-coverage-skip.json`の既存エントリ「機能要件」は未使用になるため、あわせて削除または見直しを行う)

- [x] Task 6: 動作確認(リリース前後)
  - [x] ビルド成功・トップページのHTMLにJSON-LDが出力されることを確認
  - [x] schema.orgバリデータ(validator.schema.org)での検証(2026-07-17実施: WebSiteスキーマがエラーなし・警告なしで認識され、name「べんりやつーる」・urlとも意図どおり)
  - [x] リリース後、Google Search Consoleでトップページと`/ikukyu`の再クロールをリクエストする(手動・運営者作業。2026-07-17リクエスト済み。検索結果のサイト名反映はGoogle側の再クロール後、数日〜数週間かかる場合がある)

## 掲載漏れの解消・再発防止(2026-08-01)

`/life-money-sim`(資産推移シミュレーター)・`/ai-dev-digest`(AI駆動開発ダイジェスト)が本番公開済みにもかかわらず、トップページのツールカード一覧に未掲載だったため対応する(README「アプリ一覧」表には掲載されていたが、ハブページ側の更新が漏れていた)。

- [x] Task 7: 資産推移シミュレーター・AI駆動開発ダイジェストのカードを追加
  - [x] 🔴 Red: `__tests__/page.test.tsx`に、公開済み3アプリ(育休給付金シミュレーター・資産推移シミュレーター・AI駆動開発ダイジェスト)のカードが表示されることを検証するテストを書く(仕様コメント: `specs/hub-site/requirements.md#機能要件-2`)
  - [x] 🟢 Green: `app/page.tsx`に資産推移シミュレーター(`/life-money-sim`)・AI駆動開発ダイジェスト(`/ai-dev-digest`)のカードを追加する
  - [x] requirements.mdに機能要件[2](掲載漏れ防止のルール)を追加し、[/requirement](../../.claude/skills/requirement/SKILL.md)・[/implementation](../../.claude/skills/implementation/SKILL.md)に新規アプリ初回リリース時のチェック項目を追記する

## ガイド記事一覧への導線追加(2026-08-03)

`/ikukyu/guide`(育休給付金ガイド記事3本+一覧)がサイトマップには登録済みだが、トップページ・シミュレーター画面のどちらからもリンクされておらず未発見だったため対応する。詳細は[specs/ikukyu/guide/tasks.md](../ikukyu/guide/tasks.md)のTask 10を参照(ikukyu側の変更が主で、本specへの影響は機能要件[3]の追加のみ)。

- [x] Task 8: ツールカード一覧の下にガイド記事一覧へのテキストリンクを追加(仕様コメント: `specs/hub-site/requirements.md#機能要件-3`)
