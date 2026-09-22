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
  - 🔴 `fetch`とタイマーを差し替えたテストで、(1) 最初から200なら1回で待機を終えること、(2) 404が続いたあと200になったら待機を終えること、(3) `timeoutMs`を超えても200にならなければ失敗を返すこと、(4) `fetch`が例外を投げても打ち切らず次のポーリングへ進むことを確認するテストを書く
  - 🟢 `app/lib/waitForPageAvailable.ts`に`waitForPageAvailable(url, options)`を実装する(`pollIntervalMs`既定15秒・`timeoutMs`既定10分、`fetch`・`sleep`を注入可能にする)
  - 🔵 リファクタ

- Task B: 記事URL導出の切り出し(仕様: design.md「記事ページの公開を待つ処理」手順1)
  - 🔴 記事データから記事詳細ページURLが導出されること、`buildBroadcastMessage`の本文末尾のURLが同じ関数の戻り値と一致することを確認するテストを書く
  - 🟢 `app/news-digest/lib/articleUrl.ts`に`buildArticleUrl(article)`を実装し、`buildBroadcastMessage`をこの関数を使う形に変更する(本文に載るURLと疎通確認するURLが必ず一致するようにする)
  - 🔵 リファクタ

- Task C: 配信CLIへの組み込み(仕様: design.md「記事ページの公開を待つ処理」手順4、design.md「エラーハンドリング」)
  - TDD対象外(待機ロジックはTask A、URL導出はTask Bでテスト済み。CLIはそれらを順に呼ぶだけの薄いラッパーのため。Task 2と同じ理由)
  - `scripts/news-digest/broadcast-line.ts`で、LINE Messaging APIへのPOSTの前に`waitForPageAvailable(buildArticleUrl(article))`を呼ぶ
  - 公開が確認できないまま時間切れになった場合は、LINE APIを呼ばずに最後のHTTPステータス・待機秒数を標準エラー出力へ記録し、非ゼロで終了する
