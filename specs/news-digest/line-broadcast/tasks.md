# タスク分解: LINE公式アカウントでの新着記事自動配信

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 配信メッセージ本文の組み立て(仕様: requirements.md#配信内容-1〜4、design.md「配信メッセージ本文を組み立てる処理」)
  - 🔴 記事タイトル・トピック見出し一覧(配列順・全件)・記事詳細ページへのリンクを含む所定の書式のテキストが生成されること、トピックが1件の場合も7件(上限)の場合も正しく整形されることを確認するテストを書く
  - 🟢 `app/news-digest/lib/buildBroadcastMessage.ts`に`buildBroadcastMessage(article): string`を実装する

- Task 2: 配信CLI(仕様: design.md「LINEブロードキャストメッセージを送信する処理」)
  - TDD対象外(LINE Messaging APIへの実HTTP呼び出しを伴うため。本文組み立てロジックはTask 1でテスト済み)
  - `scripts/news-digest/broadcast-line.ts`を実装する。記事データを読み込み`parseArticle`でパース、`buildBroadcastMessage`で本文を組み立て、LINE Messaging APIのブロードキャストエンドポイントへ送信する。エラー時はリトライせず失敗を記録して終了する

- Task 3: 配信ワークフローの作成(仕様: design.md「実行環境の前提」「配信タイミングをトリガーする処理」)
  - TDD対象外(GitHub Actionsのワークフロー定義のため)
  - `.github/workflows/news-digest-line-broadcast.yml`を作成する。`main`ブランチへの`content/news-digest/articles/*.json`新規追加pushをトリガーに`broadcast-line.ts`を実行する
  - 既存ファイルの変更(Modified)は対象外とし、新規追加(Added)ファイルのみを処理対象にする

- Task 4: Secretsの確認(運用タスク、design.md「実行環境の前提」「セキュリティ」)
  - TDD対象外(コード変更を伴わない運用手順)
  - ai-dev-digestが保存済みの`LINE_CHANNEL_ACCESS_TOKEN`がこのワークフローからも参照できることを確認する(新規発行は不要)
