# タスク分解: LINE公式アカウントでの新着記事自動配信

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: LINE配信メッセージ専用タイトルの組み立て(仕様: requirements.md#配信内容-2、design.md「配信メッセージ本文を組み立てる処理」手順2)
  - 🔴 `entertainment`・`2026-09-15`から`【週刊トレンド エンタメ編】2026年9月15日号`、`culture-lifestyle`・`2026-09-18`から`【週刊トレンド カルチャー編】2026年9月18日号`が生成されることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/buildBroadcastMessage.ts`に`buildBroadcastTitle(edition, date): string`を実装する

- Task 2: 配信メッセージ本文の組み立て(仕様: requirements.md#配信内容-1・3〜4、design.md「配信メッセージ本文を組み立てる処理」手順3〜5)
  - 🔴 タイトル・ジャンル名付きのトピック見出し一覧(GENRE_ORDER順、全件)・記事詳細ページへのリンクの3要素が含まれること、トピックごとの出典URLは含まれないこと、トピックが1件のときも複数件のときも正しく組み立てられることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/buildBroadcastMessage.ts`に`buildBroadcastMessage(article: Article): string`を実装する

- Task 3: 配信対象日付の判定(仕様: requirements.md#配信タイミング・方式-5〜6、design.md「配信タイミングをトリガーする処理」)(TDD対象外。git diffの解析はワークフロー内のシェルスクリプトで行うため。ai-dev-digest-line-broadcast.ymlと同じ実装パターン)
  - `.github/workflows/trend-digest-line-broadcast.yml`に、新規追加(Added)された`content/trend-digest/articles/*.json`のみを対象とする判定ステップを実装する

- Task 4: LINEブロードキャスト送信CLI(仕様: design.md「LINEブロードキャストメッセージを送信する処理」)
  - 🔴 送信APIのレスポンスをモックし、成功時(200)は成功として記録されること、失敗時(エラーレスポンス)はリトライせず失敗として記録されることを確認するテストを書く(HTTPクライアントをモック化)
  - 🟢 `scripts/trend-digest/broadcast-line.ts`を実装する。記事データを読み込み`parseArticle`でパース→`buildBroadcastMessage`で本文組み立て→LINE Messaging APIの`POST /v2/bot/message/broadcast`へ送信する

- Task 5: ワークフロー本体の実装(仕様: design.md「実行環境の前提」「配信タイミングをトリガーする処理」)
  - TDD対象外(GitHub Actionsワークフロー定義のためユニットテスト不可。ai-dev-digest-line-broadcast.ymlと同じ構造で実装する)
  - `.github/workflows/trend-digest-line-broadcast.yml`を作成する: `push`(`branches: [main]`、`paths: content/trend-digest/articles/*.json`)・`workflow_dispatch`(id入力)をトリガーに、Task 3の判定→Task 4のCLI実行を行う。既存の`LINE_CHANNEL_ACCESS_TOKEN`Secretをそのまま参照する(新規Secretは作らない)
