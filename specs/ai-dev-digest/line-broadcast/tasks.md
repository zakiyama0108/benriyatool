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
