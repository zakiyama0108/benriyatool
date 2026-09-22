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

## 2026-09-22 追加(デプロイ完了前に配信されてしまう不具合の修正)

- Task A: ページ公開待ちの共通処理(仕様: requirements.md#配信タイミング・方式-8〜9、design.md「記事ページの公開を待つ処理」)
  - 🔴 `fetch`とタイマーを差し替えたテストで、(1) 最初から200なら1回で待機を終えること、(2) 404が続いたあと200になったら待機を終えること、(3) `timeoutMs`を超えても200にならなければ失敗を返すこと、(4) `fetch`が例外を投げても打ち切らず次のポーリングへ進むことを確認するテストを書く
  - 🟢 `app/lib/waitForPageAvailable.ts`に`waitForPageAvailable(url, options)`を実装する(`pollIntervalMs`既定15秒・`timeoutMs`既定10分、`fetch`・`sleep`を注入可能にする)
  - 🔵 リファクタ

- Task B: 記事URL導出の切り出し(仕様: design.md「記事ページの公開を待つ処理」手順1)
  - 🔴 記事データから記事詳細ページURLが導出されること、`buildBroadcastMessage`の本文末尾のURLが同じ関数の戻り値と一致することを確認するテストを書く
  - 🟢 `app/trend-digest/lib/articleUrl.ts`に`buildArticleUrl(article)`を実装し、`buildBroadcastMessage`をこの関数を使う形に変更する(本文に載るURLと疎通確認するURLが必ず一致するようにする)
  - 🔵 リファクタ

- Task C: 配信CLIへの組み込み(仕様: design.md「記事ページの公開を待つ処理」手順4、design.md「エラーハンドリング」)
  - TDD対象外(待機ロジックはTask A、URL導出はTask Bでテスト済み。CLIはそれらを順に呼ぶだけの薄いラッパーのため。Task 2と同じ理由)
  - `scripts/trend-digest/broadcast-line.ts`で、LINE Messaging APIへのPOSTの前に`waitForPageAvailable(buildArticleUrl(article))`を呼ぶ
  - 公開が確認できないまま時間切れになった場合は、LINE APIを呼ばずに最後のHTTPステータス・待機秒数を標準エラー出力へ記録し、非ゼロで終了する
