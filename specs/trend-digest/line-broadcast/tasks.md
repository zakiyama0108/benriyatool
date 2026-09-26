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
  - 3アプリ共通。内容は[ai-dev-digest/line-broadcast/tasks.md](../../ai-dev-digest/line-broadcast/tasks.md)のTask Aを参照(`app/lib/waitForPageAvailable.ts`・`__tests__/lib/waitForPageAvailable.test.ts`は3アプリの配信CLIで共有する1つの実装であり、着手はいずれか1アプリで1回のみでよい)

- Task B: 記事URL導出の切り出し(仕様: design.md「記事ページの公開を待つ処理」、手順は[../../ai-dev-digest/line-broadcast/design.md](../../ai-dev-digest/line-broadcast/design.md)「記事ページの公開を待つ処理」手順1を参照)
  - 🔴 記事データから記事詳細ページURLが導出されること、`buildBroadcastMessage`の本文末尾のURLが同じ関数の戻り値と一致することを確認するテストを書く
  - 🟢 `app/trend-digest/lib/articleUrl.ts`に`buildArticleUrl(article)`を実装し、`buildBroadcastMessage`をこの関数を使う形に変更する(本文に載るURLと疎通確認するURLが必ず一致するようにする)
  - 🔵 リファクタ

- Task C: 配信CLIへの組み込み(仕様: design.md「記事ページの公開を待つ処理」、design.md「エラーハンドリング」、手順は[../../ai-dev-digest/line-broadcast/design.md](../../ai-dev-digest/line-broadcast/design.md)「記事ページの公開を待つ処理」手順4〜5を参照)
  - trend-digestの配信CLI(`scripts/trend-digest/broadcast-line.ts`)はTask 4で実際にテスト(`__tests__/trend-digest/scripts/broadcast-line.test.ts`)を書いているため、ai-dev-digest/news-digestと異なりTDD対象外にはせず、既存テストの更新を伴うTDDタスクとして進める
  - 🔴 既存の`__tests__/trend-digest/scripts/broadcast-line.test.ts`を更新する。既存2ケースは`expect(fetchMock).toHaveBeenCalledTimes(1)`と`fetchMock.mock.calls[0]`がLINE API呼び出しであることを前提にしているが、POST前に公開確認のGETが挟まると2回目の呼び出しがLINE APIになるため、公開確認のfetch(200を返す)をモックに追加し、呼び出し回数(2回)とLINE API呼び出しが`mock.calls[1]`であることを前提にしたアサーションへ直す。加えて、公開確認が時間切れになった場合はLINE APIを呼ばずに失敗として終了することを確認するケースを追加する(この検証のため、`broadcastArticle`に待機設定(`pollIntervalMs`・`timeoutMs`・`sleep`)を差し替える任意引数を足し、テストから短い値・フェイクの`sleep`を渡せるようにする。既定値は本番用のまま。[../../ai-dev-digest/line-broadcast/design.md](../../ai-dev-digest/line-broadcast/design.md)「記事ページの公開を待つ処理」の「テストからの注入」参照)
  - 🟢 `scripts/trend-digest/broadcast-line.ts`で、LINE Messaging APIへのPOSTの前に`waitForPageAvailable(buildArticleUrl(article), { onAttempt })`を呼ぶ。`onAttempt`には試行ごとの経過秒数とHTTPステータスを`console.error`で実行ログに記録するコールバックを渡す([ai-dev-digest/line-broadcast/design.md#ログ](../../ai-dev-digest/line-broadcast/design.md)参照。このファイルは`no-console`の例外対象のため`console.error`を直接呼べる)。公開が確認できないまま時間切れになった場合は、LINE APIを呼ばずに最後のHTTPステータス・経過時間(戻り値のミリ秒。`onAttempt`が渡す経過秒数とは単位が異なる)を標準エラー出力へ記録し、非ゼロで終了する
  - 🔵 リファクタ

- Task D: 本番での通し動作確認(仕様: requirements.md#配信タイミング・方式-8〜9)
  - Task A〜Cが揃った状態で、実際の週次記事マージ(またはworkflow_dispatch)により配信ワークフローを実行し、実行ログに公開待ちのポーリングログ(試行ごとの経過秒数とHTTPステータス)が記録されることを確認する(デプロイ完了まで約2分・その間404というタイミング差はユニットテストで再現できないため、本番環境での確認が必要)
  - LINE通知の到達が本番デプロイ完了より後になり、通知に載ったリンクを開いた時点で記事ページが閲覧できることを確認する
  - 実行ログから、記事ページへのGETで実際に観測したリダイレクトのHTTPステータスコードを確認する(design.md「記事ページの公開を待つ処理」の「3xx」という記述の実際の値を裏取りする)
