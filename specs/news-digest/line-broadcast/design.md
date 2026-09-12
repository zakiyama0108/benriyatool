# 設計: LINE公式アカウントでの新着記事自動配信

## サマリ
記事マージ(mainへのpush、`content/news-digest/articles/*.json`の新規追加)をトリガーに、独立したGitHub Actionsワークフローが記事タイトル・トピック見出し一覧・記事リンクをai-dev-digest・trend-digestと共通のLINE公式アカウントからブロードキャスト配信する。ai-dev-digestのline-broadcastと同一の設計・配信フォーマットを踏襲し、配信元アカウント・チャネルアクセストークンも共有する。

## 実行環境の前提

ai-dev-digestのline-broadcast/design.mdと同じ考え方で、独立した新規ワークフロー`.github/workflows/news-digest-line-broadcast.yml`とする(`push`イベント(`branches: main`、`paths: content/news-digest/articles/*.json`)をトリガーにする理由もai-dev-digestと同じ。マージ完了を別途ポーリングする複雑さを避けられる)。

- 配信スクリプトは`scripts/news-digest/`配下に置く
- **配信元のLINE公式アカウント・チャネルアクセストークンはai-dev-digest・trend-digestと共通のものを利用する**(requirements.mdビジネスルール[1]。新規アカウントは開設しない)。既にActions Secretsに保存済みの`LINE_CHANNEL_ACCESS_TOKEN`をそのまま参照する(news-digest専用の新しいSecretは追加しない)
- このワークフローはGitHubへの書き込み(コミット・PR作成等)を一切行わないため、[weekly-publish](../weekly-publish/design.md)が使う書き込み用PAT(`NEWS_DIGEST_GH_PAT`)は使わない。リポジトリのチェックアウトのみが必要なため、ワークフロー既定の`GITHUB_TOKEN`で足りる

## 処理フロー

### 配信タイミングをトリガーする処理
- 対象: `main`ブランチへのpush(weekly-publishの週次記事PRが自動マージされた結果として発生するpush)
- 手順:
  1. `content/news-digest/articles/*.json`パターンに一致するファイルへの変更を含む、`main`ブランチへのpushでのみワークフローを起動する
  2. pushに含まれる変更のうち、新規追加(Added)されたファイルのみを対象とする。既存ファイルの変更(Modified)は対象外とする(requirements.md#配信タイミング・方式-6)
  3. 新規追加ファイルが1件もない場合は、何もせず処理を終える
  4. 新規追加ファイルが見つかった場合、そのファイル名(`<date>.json`)から対象日付を取り出し、以降の処理に渡す
- 関連するビジネスルール: requirements.md#配信タイミング・方式-5〜6

### 配信メッセージ本文を組み立てる処理
- 対象: 新規追加された記事データ(`content/news-digest/articles/<date>.json`)
- 手順:
  1. 記事データを読み込み、[article-detail/design.md](../article-detail/design.md)が定めるスキーマ(`parseArticle`)でパースする
  2. `buildArticleTitle(date)`([content-generation/design.md](../content-generation/design.md)が定める処理と同じ関数をそのまま利用)で記事タイトルを導出する
  3. `topics`配列の順に、各トピックの`heading`を全件、箇条書き形式で並べる(requirements.md#配信内容-3)
  4. 記事詳細ページのURL(`https://benriyatool.com/news-digest/<date>`)を1本だけ末尾に付与する(requirements.md#配信内容-4)
  5. 改行区切りの1本のテキストメッセージとして組み立てる。書式はai-dev-digestと同じ:
     ```
     <記事タイトル>

     ・<トピック見出し1>
     ・<トピック見出し2>
     ・<トピック見出し3>

     記事を読む
     https://benriyatool.com/news-digest/<date>
     ```
  6. LINE Messaging APIのテキストメッセージ上限(公式ドキュメント上5000文字)への特別な切り詰め処理は設けない(トピック件数は最大7件・各見出しも短文のため超過の可能性は低い。万一超過した場合は下記エラーハンドリングに従う)
- 関連するビジネスルール: requirements.md#配信内容-1〜4

### LINEブロードキャストメッセージを送信する処理
- 対象: 組み立てたメッセージ本文
- 手順:
  1. LINE Messaging APIのブロードキャストメッセージ送信エンドポイント(`POST https://api.line.me/v2/bot/message/broadcast`)へ、`Authorization: Bearer <チャネルアクセストークン>`ヘッダーを付けてリクエストする(友だち全員への一斉配信。requirements.md#配信タイミング・方式-7)
  2. リクエストボディは`{"messages": [{"type": "text", "text": "<組み立てたメッセージ>"}]}`とする
  3. レスポンスが成功(HTTPステータス200)の場合、配信成功として実行ログに記録する
  4. レスポンスが失敗の場合、リトライはせず、下記エラーハンドリングに従う
- 関連するビジネスルール: requirements.md#配信タイミング・方式-7、requirements.md#無料枠と配信失敗時の扱い-3〜4

## エラーハンドリング

- 記事データのパースに失敗した場合、配信を行わずワークフローのステップを異常終了させる
- LINE配信APIがエラーを返した場合(無料枠超過・一時的なAPIエラーいずれも)、リトライは行わずワークフローのそのステップを失敗として終了する(requirements.md#無料枠と配信失敗時の扱い-3〜4)。このワークフローは記事公開(weekly-publishのPRマージ)が完了した後に起動する独立ワークフローのため、配信の失敗が記事公開自体に影響を及ぼす経路は存在しない
- 配信失敗時の記録方法: 専用のGitHub Issue作成等の追加の通知手段は設けず、GitHub Actionsのワークフロー実行結果(失敗)と実行ログの内容で運営者が把握する(ai-dev-digestと同じ方針。日次・週次いずれも無料枠が少なく配信失敗の発生頻度は低いと見込まれ、追加の通知基盤を持つコストに見合わないと判断した)

## 関連するファイル(抜粋)

```
.github/workflows/news-digest-line-broadcast.yml (新規: mainへのpush(content/news-digest/articles/*.jsonの新規追加)をトリガーに配信を実行するワークフロー)
app/news-digest/lib/buildBroadcastMessage.ts (新規: 記事データからLINE配信用のテキスト本文を組み立てる純粋関数)
scripts/news-digest/broadcast-line.ts (新規: 記事データを読み込みbuildBroadcastMessageで組み立て、LINE Messaging APIへ送信するCLI)
app/news-digest/lib/articleTitle.ts (既存: buildArticleTitleを利用)
app/news-digest/lib/articleSchema.ts (既存: parseArticleを利用)
content/news-digest/articles/<date>.json (既存: 配信内容の元データ)
```

## セキュリティ

- チャネルアクセストークン(`LINE_CHANNEL_ACCESS_TOKEN`)はai-dev-digestが既に保存済みのActions Secretsをそのまま参照する(trend-digestの配信とも共有している)。news-digest専用の新しいトークンは発行しない(requirements.mdビジネスルール[1]〜[2])
- このワークフローはGitHubへの書き込みを一切行わないため、書き込み用PAT(`NEWS_DIGEST_GH_PAT`)は使わない。リポジトリのチェックアウトにはワークフロー既定の読み取り専用`GITHUB_TOKEN`を使う
- 配信メッセージの本文は記事データ(開発者・エージェントが作成しリポジトリにコミットされるコンテンツ)のみから組み立てられ、訪問者からの入力を一切含まない
- 配信は友だち全員への一斉配信(ブロードキャスト)のみを行い、個々の友だちを識別・追跡する情報を扱わない

## ログ

- ワークフロー実行ごとに、対象日付・配信対象トピック数・LINE APIへのリクエスト結果(成功/失敗)をGitHub Actionsのワークフロー実行ログに記録する
- 配信に失敗した場合は、HTTPステータス・エラーレスポンス概要も合わせて記録する
- リクエストヘッダー(`Authorization: Bearer <チャネルアクセストークン>`)はいかなる場合もログに出力しない
