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
  - ai-dev-digestが保存済みの`LINE_CHANNEL_ACCESS_TOKEN`(trend-digestの配信とも共有)がこのワークフローからも参照できることを確認する(新規発行は不要)

## 2026-09-22 追加(デプロイ完了前に配信されてしまう不具合の修正)

- Task A: ページ公開待ちの共通処理(仕様: requirements.md#配信タイミング・方式-8〜9、design.md「記事ページの公開を待つ処理」)
  - 3アプリ共通。内容は[ai-dev-digest/line-broadcast/tasks.md](../../ai-dev-digest/line-broadcast/tasks.md)のTask Aを参照(`app/lib/waitForPageAvailable.ts`・`__tests__/lib/waitForPageAvailable.test.ts`は3アプリの配信CLIで共有する1つの実装であり、着手はいずれか1アプリで1回のみでよい)

- Task B: 記事URL導出の切り出し(仕様: design.md「記事ページの公開を待つ処理」、手順は[../../ai-dev-digest/line-broadcast/design.md](../../ai-dev-digest/line-broadcast/design.md)「記事ページの公開を待つ処理」手順1を参照)
  - 🔴 記事データから記事詳細ページURLが導出されること、`buildBroadcastMessage`の本文末尾のURLが同じ関数の戻り値と一致することを確認するテストを書く
  - 🟢 `app/news-digest/lib/articleUrl.ts`に`buildArticleUrl(article)`を実装し、`buildBroadcastMessage`をこの関数を使う形に変更する(本文に載るURLと疎通確認するURLが必ず一致するようにする)
  - 🔵 リファクタ

- Task C: 配信CLIへの組み込み(仕様: design.md「記事ページの公開を待つ処理」、design.md「エラーハンドリング」、手順は[../../ai-dev-digest/line-broadcast/design.md](../../ai-dev-digest/line-broadcast/design.md)「記事ページの公開を待つ処理」手順4を参照)
  - TDD対象外(待機ロジックはTask A、URL導出はTask Bでテスト済み。CLIはそれらを順に呼ぶだけの薄いラッパーのため。Task 2と同じ理由)
  - `scripts/news-digest/broadcast-line.ts`で、LINE Messaging APIへのPOSTの前に`waitForPageAvailable(buildArticleUrl(article), { onAttempt })`を呼ぶ。`onAttempt`には試行ごとの経過秒数とHTTPステータスを`console.error`で実行ログに記録するコールバックを渡す([ai-dev-digest/line-broadcast/design.md#ログ](../../ai-dev-digest/line-broadcast/design.md)参照。このファイルは`no-console`の例外対象のため`console.error`を直接呼べる)
  - 公開が確認できないまま時間切れになった場合は、LINE APIを呼ばずに最後のHTTPステータス・経過時間(戻り値のミリ秒。`onAttempt`が渡す経過秒数とは単位が異なる)を標準エラー出力へ記録し、非ゼロで終了する

- Task D: 本番での通し動作確認(仕様: requirements.md#配信タイミング・方式-8〜9)
  - Task A〜Cが揃った状態で、実際の週次記事マージ(またはworkflow_dispatch)により配信ワークフローを実行し、実行ログに公開待ちのポーリングログ(試行ごとの経過秒数とHTTPステータス)が記録されることを確認する(デプロイ完了まで約2分・その間404というタイミング差はユニットテストで再現できないため、本番環境での確認が必要)
  - LINE通知の到達が本番デプロイ完了より後になり、通知に載ったリンクを開いた時点で記事ページが閲覧できることを確認する
  - 実行ログから、記事ページへのGETで実際に観測したリダイレクトのHTTPステータスコードを確認する(design.md「記事ページの公開を待つ処理」の「3xx」という記述の実際の値を裏取りする)
