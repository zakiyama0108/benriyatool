# タスク分解: LINE公式アカウントでの新着記事自動配信

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## コード側の実装

- Task 1: 配信メッセージ本文を組み立てる処理(仕様: design.md「配信メッセージ本文を組み立てる処理」)
  - 🔴 記事データ(`Article`)から、記事タイトル・トピック見出し一覧(掲載順・全件)・記事詳細ページURLを含むテキストが組み立てられることを確認するテストを書く(トピック1件の場合・5件の場合・出典URLが本文に含まれないことも確認する)
  - 🟢 `app/ai-dev-digest/lib/buildBroadcastMessage.ts`に`buildBroadcastMessage(article: Article): string`を実装する
  - 🔵 リファクタ

- Task 2: LINE配信CLIの実装(仕様: design.md「LINEブロードキャストメッセージを送信する処理」)
  - TDD対象外(LINE Messaging APIへのHTTPリクエストを行うだけの薄いラッパーのため。メッセージ組み立てロジック自体はTask1でテスト済み)
  - `scripts/ai-dev-digest/broadcast-line.ts`を実装する。記事データのファイルパスを引数に受け取り、`parseArticle`でパース→`buildBroadcastMessage`で本文を組み立て→`LINE_CHANNEL_ACCESS_TOKEN`を使いLINE Messaging APIのブロードキャストエンドポイントへPOSTするCLIにする
  - レスポンスが200以外の場合はHTTPステータス・エラーレスポンス概要を標準エラー出力に記録し、非ゼロで終了する(design.md「エラーハンドリング」)

- Task 3: ワークフロー本体の実装(仕様: design.md「配信タイミングをトリガーする処理」)
  - TDD対象外(GitHub Actionsのワークフロー定義ファイルであり、内部で呼ぶスクリプトはTask1・2でテスト済みのため)
  - `.github/workflows/ai-dev-digest-line-broadcast.yml`を実装する。`main`ブランチへの`push`(`content/ai-dev-digest/articles/*.json`のパスフィルタ)をトリガーにする
  - pushに含まれる変更のうち新規追加(Added)されたファイルのみを対象とする判定を実装する(`git diff --name-status`等で追加/変更を区別する。design.md「配信タイミングをトリガーする処理」手順2)
  - 新規追加ファイルが見つかった場合のみ、その日付で`scripts/ai-dev-digest/broadcast-line.ts`を実行する。見つからない場合は何もせず終了する
  - 手動での動作確認用に`workflow_dispatch`(日付を入力できるinput)も用意する(daily-publishと同様の運用上の配慮)

## 運用設定(コード外)

- Task 4: GitHub Actions Secretsの設定(仕様: design.md「実行環境の前提」)
  - 運営者がLINE Developersコンソールで、屋号名義の一般アカウント(認証済みアカウントではない標準区分)を開設する(requirements.mdビジネスルール[1]、本specの自動化対象外の手動作業)
  - 運営者がチャネルアクセストークンを発行する(requirements.mdビジネスルール[2]、本specの自動化対象外の手動作業)
  - 発行済みのチャネルアクセストークンを`LINE_CHANNEL_ACCESS_TOKEN`としてこのリポジトリのActions Secretsに保存する
  - 動作確認のため、運営者自身のLINEアカウントを当該公式アカウントの友だちに追加しておく
  - このリポジトリの月間メッセージ通数がLINE公式アカウントの無料プラン(月200通まで無料)の範囲に収まる想定であることを確認する(requirements.mdビジネスルール[3])

## 動作確認

- Task 5: 通しの動作確認(仕様: requirements.md#配信タイミング・方式-5〜7、requirements.md#無料枠と配信失敗時の扱い-4〜6)
  - Task 1〜4が揃った状態で、`workflow_dispatch`または実際の日次記事マージにより配信が実行され、LINE公式アカウントの友だち(運営者自身のテストアカウント)にメッセージが届くことを確認する
  - メッセージの内容(記事タイトル・トピック見出し一覧・記事リンク)が実際の記事データと一致することを確認する
  - チャネルアクセストークンを意図的に不正な値にする等でLINE APIをエラーにさせ、ワークフローのステップが失敗として終了し、実行ログにエラー概要が記録されることを確認する(リトライが行われないことも合わせて確認する)
  - 既存記事ファイルを内容変更のみ(新規追加ではない)でpushしても、このワークフローが配信を行わないことを確認する(過去記事の再配信防止の安全策の確認)

## 2026-09-22 追加(デプロイ完了前に配信されてしまう不具合の修正)

- Task A: ページ公開待ちの共通処理(仕様: requirements.md#配信タイミング・方式-8〜9、design.md「記事ページの公開を待つ処理」)
  - 着手時: ai-dev-digest/news-digest/trend-digestの3つのrequirements.md先頭にある`> ステータス: 仕様確認中(未実装)`をすべて削除する(この行がある間は`check:spec-coverage`の対象外になり、既にリリース済みの[1]〜[7]分の網も一時的に外れてしまうため。承認後、実装の最初の🔴Redで削除する運用)
  - 🔴 テストは`__tests__/lib/waitForPageAvailable.test.ts`(新設)に書く。`app/lib/`↔`__tests__/lib/`は、既存の`app/components/`↔`__tests__/components/`と同じ並べ方で、CLAUDE.md「フォルダ構成」のサイト全体に関わるものを直下に置く規約に沿う。`fetch`とタイマーを差し替えたテストで、(1) 最初から200なら1回で待機を終えること、(2) 404が続いたあと200になったら待機を終えること、(3) 3xxリダイレクト(例: 308)を経て最終的に200になった場合も公開済みと判定すること(`fetch`既定の`redirect: 'follow'`のまま`manual`にしないことの確認。design.md「記事ページの公開を待つ処理」参照)、(4) `timeoutMs`を超えても200にならなければ失敗を返すこと、(5) `fetch`が例外を投げても打ち切らず次のポーリングへ進むこと、(6) 時間切れ時の戻り値に最後に観測したHTTPステータスと経過時間(ミリ秒)が含まれることを確認するテストを書く。加えて、(7) `onAttempt`コールバック(試行ごとに経過秒数とHTTPステータスを渡す)を渡すと各試行後に呼ばれること、コールバックを渡さなくても動作することを確認するテストも書く(design.md「記事ページの公開を待つ処理」手順5参照。`waitForPageAvailable.ts`自体は`console`を使わないため、ログ出力の確認はこの関数のテストの対象外)。この`describe`の直前に`// 仕様:`コメントを置き、3スペック分・計9件のアンカーをフルパス・「、」区切りで列挙する(`scripts/check-spec-coverage.mjs`は`__tests__/`配下のコメントしか走査せず、区切りも「、specs/」のみ対応のため、実装ファイル`app/lib/waitForPageAvailable.ts`側への記載やハイフン併記`-8`・`-9`ではdangling refになりカバレッジに反映されない): `specs/ai-dev-digest/line-broadcast/requirements.md#配信タイミング・方式-8`、`specs/ai-dev-digest/line-broadcast/requirements.md#配信タイミング・方式-9`、`specs/ai-dev-digest/line-broadcast/design.md#記事ページの公開を待つ処理`、`specs/news-digest/line-broadcast/requirements.md#配信タイミング・方式-8`、`specs/news-digest/line-broadcast/requirements.md#配信タイミング・方式-9`、`specs/news-digest/line-broadcast/design.md#記事ページの公開を待つ処理`、`specs/trend-digest/line-broadcast/requirements.md#配信タイミング・方式-8`、`specs/trend-digest/line-broadcast/requirements.md#配信タイミング・方式-9`、`specs/trend-digest/line-broadcast/design.md#記事ページの公開を待つ処理`
  - 🟢 `app/lib/waitForPageAvailable.ts`に`waitForPageAvailable(url, options)`を実装する(`pollIntervalMs`既定15秒・`timeoutMs`既定10分、`fetch`・`sleep`を注入可能にする。`fetch`呼び出しはデフォルトの`redirect: 'follow'`のままとし`manual`は使わない)。`options`には試行ごとの結果(経過秒数・HTTPステータス)を呼び出し元へ渡すコールバック`onAttempt`を含め、`waitForPageAvailable.ts`自体は`console`を一切使わない(design.md「記事ページの公開を待つ処理」手順5参照。`no-console`の例外は`scripts/`配下のみで`app/`配下では`npm run lint`が失敗するため)。この1ファイルはai-dev-digest/news-digest/trend-digestの3配信CLIで共有する
  - 🔵 リファクタ
  - 上記9件のアンカーが揃うことで、[8][9]と新design見出し「記事ページの公開を待つ処理」はこのTask A自身の実テストで実際にカバーされるため、`scripts/spec-coverage-skip.json`への新規登録は不要になる

- Task B: 記事URL導出の切り出し(仕様: design.md「記事ページの公開を待つ処理」手順1)
  - 🔴 記事データから記事詳細ページURLが導出されること、`buildBroadcastMessage`の本文末尾のURLが同じ関数の戻り値と一致することを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/articleUrl.ts`に`buildArticleUrl(article)`を実装し、`buildBroadcastMessage`をこの関数を使う形に変更する(本文に載るURLと疎通確認するURLが必ず一致するようにする)
  - 🔵 リファクタ

- Task C: 配信CLIへの組み込み(仕様: design.md「記事ページの公開を待つ処理」手順4、design.md「エラーハンドリング」)
  - TDD対象外(待機ロジックはTask A、URL導出はTask Bでテスト済み。CLIはそれらを順に呼ぶだけの薄いラッパーのため。Task 2と同じ理由)
  - `scripts/ai-dev-digest/broadcast-line.ts`で、LINE Messaging APIへのPOSTの前に`waitForPageAvailable(buildArticleUrl(article), { onAttempt })`を呼ぶ。`onAttempt`には試行ごとの経過秒数とHTTPステータスを`console.error`で実行ログに記録するコールバックを渡す(design.md「記事ページの公開を待つ処理」手順5・「ログ」参照。このファイルは`no-console`の例外対象のため`console.error`を直接呼べる)
  - 公開が確認できないまま時間切れになった場合は、LINE APIを呼ばずに最後のHTTPステータス・待機秒数を標準エラー出力へ記録し、非ゼロで終了する

- Task D: 本番での通し動作確認(仕様: requirements.md#配信タイミング・方式-8〜9)
  - Task A〜Cが揃った状態で、実際の日次記事マージ(またはworkflow_dispatch)により配信ワークフローを実行し、実行ログに公開待ちのポーリングログ(試行ごとの経過秒数とHTTPステータス)が記録されることを確認する(デプロイ完了まで約2分・その間404というタイミング差はユニットテストで再現できないため、本番環境での確認が必要)
  - LINE通知の到達が本番デプロイ完了より後になり、通知に載ったリンクを開いた時点で記事ページが閲覧できることを確認する
  - 実行ログから、記事ページへのGETで実際に観測したリダイレクトのHTTPステータスコード(308か、Cloudflare Workersの既定によるそれ以外の3xxか)を確認する(design.md「記事ページの公開を待つ処理」手順2の「3xx」という記述の実際の値を裏取りする)
