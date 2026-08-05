# 設計: LINE公式アカウントでの新着記事自動配信

## 実行環境の前提(初導入のため明記する設計判断)

配信は[daily-publish](../daily-publish/design.md)の`ai-dev-digest-daily.yml`にジョブを追加するのではなく、独立した新規ワークフロー`.github/workflows/ai-dev-digest-line-broadcast.yml`とする。

- **別ファイルに分ける理由**: `ai-dev-digest-daily.yml`の`publish`ジョブは記事PRの作成とauto-mergeの有効化までを行うが、実際のマージはそのジョブの実行が終わった後、`ci.yml`の完了を待って非同期に行われる(auto-mergeの仕組み上、CI成功のタイミングはジョブ実行中には確定しない)。そのため「PRがmainへ自動マージされた直後」というタイミングを`publish`ジョブの内部で待ち受けることはできない。GitHubの`push`イベント(`branches: main`、`paths: content/ai-dev-digest/articles/*.json`)を使えば、実際にmainへマージされた瞬間をそのまま起動条件にでき、マージ完了を別途ポーリングする複雑さを避けられる。この`push`トリガーは`ai-dev-digest-daily.yml`の`schedule`/`workflow_run`トリガーとは種別が異なるため、同一ファイルに同居させるより別ファイルに分ける方が単純である(requirements.md#配信タイミング・方式-5は「同じワークフロー(または後続ジョブ)」を許容しており、別ファイルもこの要件を満たす設計判断とする)
- 配信スクリプトは既存の収集・選定スクリプトと同じ置き場所の慣習に従い`scripts/ai-dev-digest/`配下に置く
- LINE公式アカウントの開設・チャネルアクセストークンの発行は運営者が事前に手動で行う(requirements.mdビジネスルール[2]、本specの自動化対象外)。発行済みのチャネルアクセストークンは`LINE_CHANNEL_ACCESS_TOKEN`としてこのリポジトリのActions Secretsに保存する
- このワークフローはGitHubへの書き込み(コミット・PR作成等)を一切行わないため、[daily-publish](../daily-publish/design.md)が使う書き込み用PAT(`AI_DEV_DIGEST_GH_PAT`)は使わない。リポジトリのチェックアウトのみが必要なため、ワークフロー既定の`GITHUB_TOKEN`で足りる
- 運用開始前に、`LINE_CHANNEL_ACCESS_TOKEN`が実際にリポジトリのActions Secretsに設定されていることを確認する(daily-publish/design.mdと同様、コードで強制できない前提条件のため運用手順として確認する)

## 処理フロー

### 配信タイミングをトリガーする処理
- 対象: `main`ブランチへのpush(daily-publishの日次記事PRが自動マージされた結果として発生するpush)
- 手順:
  1. `content/ai-dev-digest/articles/*.json`パターンに一致するファイルへの変更を含む、`main`ブランチへのpushでのみワークフローを起動する(GitHub Actionsのパスフィルタ)
  2. pushに含まれる変更のうち、**新規追加(Added)されたファイルのみ**を対象とする。既存ファイルの変更(Modified)は対象外とする(過去記事の内容を手動で修正するpush等でこのワークフローが再度起動しても、既存日付の記事を再配信しないための安全策。requirements.md#配信タイミング・方式-6「過去記事の再配信・複数回配信は行わない」に対応)
  3. 新規追加ファイルが1件もない場合(記事以外の変更のみのpush等、パスフィルタと組み合わさっても稀に発生しうる)は、何もせず処理を終える
  4. 新規追加ファイルが見つかった場合、そのファイル名(`<date>.json`)から対象日付を取り出し、以降の処理に渡す(通常は1件。複数件見つかった場合も同様にそれぞれの日付に対して以降の処理を順に行う)
- 関連するビジネスルール: requirements.md#配信タイミング・方式-5、requirements.md#配信タイミング・方式-6

### 配信メッセージ本文を組み立てる処理
- 対象: 新規追加された記事データ(`content/ai-dev-digest/articles/<date>.json`)
- 手順:
  1. 記事データを読み込み、[article-detail/design.md](../article-detail/design.md)が定めるスキーマ(`parseArticle`)でパースする(不正なデータの場合は後述エラーハンドリングに従う)
  2. `buildArticleTitle(date)`([content-generation/design.md](../content-generation/design.md)が定める処理と同じ関数をそのまま利用。requirements.md#配信内容-2)で記事タイトルを導出する
  3. `topics`配列の順に、各トピックの`heading`を全件、箇条書き形式で並べる(requirements.md#配信内容-3)
  4. 記事詳細ページのURL(`https://benriyatool.com/ai-dev-digest/<date>`)を1本だけ末尾に付与する。トピックごとの出典URL(`sourceUrl`)は含めない(requirements.md#配信内容-4)
  5. 上記(タイトル・トピック見出し一覧・リンク)を改行区切りの1本のテキストメッセージとして組み立てる。具体的な書式は以下とする:
     ```
     <記事タイトル>

     ・<トピック見出し1>
     ・<トピック見出し2>
     ・<トピック見出し3>

     記事を読む
     https://benriyatool.com/ai-dev-digest/<date>
     ```
  6. LINE Messaging APIのテキストメッセージには文字数上限(公式ドキュメント上5000文字)があるが、トピック件数は最大5件・各見出しも短文であるため、通常の記事データでこの上限を超過する可能性は低いと見込まれる。本specでは上限超過への特別な切り詰め処理は設けず、万一超過した場合は後述のエラーハンドリング(LINE配信APIがエラーを返した場合の扱い)に従う
- 関連するビジネスルール: requirements.md#配信内容-1〜4

### LINEブロードキャストメッセージを送信する処理
- 対象: 組み立てたメッセージ本文
- 手順:
  1. LINE Messaging APIのブロードキャストメッセージ送信エンドポイント(`POST https://api.line.me/v2/bot/message/broadcast`)へ、`Authorization: Bearer <チャネルアクセストークン>`ヘッダーを付けてリクエストする(友だち全員への一斉配信。セグメント配信は行わない。requirements.md#配信タイミング・方式-7)。実装時に[LINE Developers公式ドキュメント](https://developers.line.biz/ja/reference/messaging-api/#send-broadcast-message)でエンドポイント・リクエスト形式の最新仕様を確認する
  2. リクエストボディは`{"messages": [{"type": "text", "text": "<組み立てたメッセージ>"}]}`とする(テキストメッセージ1件のみ)
  3. レスポンスが成功(HTTPステータス200)の場合、配信成功として実行ログに記録する
  4. レスポンスが失敗の場合(月間無料通数超過によるエラー・その他一時的なAPIエラーいずれも)、リトライはせず、下記エラーハンドリングに従う
- 関連するビジネスルール: requirements.md#配信タイミング・方式-7、requirements.md#無料枠と配信失敗時の扱い-3〜5

## エラーハンドリング

- 記事データのパースに失敗した場合(通常は発生しない想定。article-detailのビルド時バリデーションを既に通過したデータのはずだが、念のため防御的に検証する)、配信を行わずワークフローのステップを異常終了させる
- LINE配信APIがエラーを返した場合(無料枠超過・一時的なAPIエラーいずれも)、リトライは行わずワークフローのそのステップを失敗として終了する(requirements.md#無料枠と配信失敗時の扱い-4〜5)。このワークフローは記事公開(daily-publishのPRマージ)が完了した**後**に、ファイルが分離された独立のワークフローとして起動するため、配信の失敗がdaily-publishの処理(記事公開)自体に影響を及ぼす経路はそもそも存在しない(requirements.mdビジネスルール[4])
- 配信失敗時の記録方法: [daily-publish](../daily-publish/design.md)の「CI失敗時に記録する処理」はPRコメントとして記録するが、本処理はPRマージ後(PRが既にクローズ済み)に実行されるためコメント先のPRが存在しない。専用のGitHub Issue作成等の追加の通知手段は設けず、GitHub Actionsのワークフロー実行結果(失敗)と実行ログの内容で運営者が把握する方式とする(daily-publish/design.mdの「記事生成処理自体が例外で中断した場合」(PR自体が作られない失敗をGitHub Actionsの実行結果で把握する)と同じ考え方。無料枠が月200通と少なく配信失敗の発生頻度は低いと見込まれ、追加の通知基盤を持つコストに見合わないと判断した。要件[6]が定める「原因を記録し、運営者が把握できるようにする」は、失敗したステップ名・HTTPステータス・エラーレスポンス概要を実行ログに出力することで満たす)

## 関連するファイル(抜粋)

```
.github/workflows/ai-dev-digest-line-broadcast.yml (新規: mainへのpush(content/ai-dev-digest/articles/*.jsonの新規追加)をトリガーに配信を実行するワークフロー)
app/ai-dev-digest/lib/buildBroadcastMessage.ts (新規: 記事データからLINE配信用のテキスト本文を組み立てる純粋関数)
scripts/ai-dev-digest/broadcast-line.ts (新規: 記事データを読み込みbuildBroadcastMessageで組み立て、LINE Messaging APIへ送信するCLI)
app/ai-dev-digest/lib/articleTitle.ts (既存: buildArticleTitleを利用)
app/ai-dev-digest/lib/articleSchema.ts (既存: parseArticleを利用)
content/ai-dev-digest/articles/<date>.json (既存: 配信内容の元データ)
```

## セキュリティ

- チャネルアクセストークン(`LINE_CHANNEL_ACCESS_TOKEN`)は、このリポジトリのActions Secretsとして暗号化保存する(暗号化され、ワークフロー実行時以外は値を参照できないGitHubの標準機能。daily-publishの各Secretsと同じ扱い)
- トークンの発行自体は運営者がLINE Developersコンソールで事前に手動で行う(requirements.mdビジネスルール[2]、本specの自動化対象には含めない)。漏えい時は運営者がLINE Developersコンソールでトークンを再発行し、Secretsを更新する運用とする
- このワークフローはGitHubへの書き込み(コミット・PR作成等)を一切行わないため、書き込み用PAT(`AI_DEV_DIGEST_GH_PAT`)は使わない(上記「実行環境の前提」参照)。リポジトリのチェックアウトにはワークフロー既定の読み取り専用`GITHUB_TOKEN`を使う
- 配信メッセージの本文は記事データ(開発者・エージェントが作成しリポジトリにコミットされるコンテンツ)のみから組み立てられ、訪問者からの入力を一切含まない
- 配信は友だち全員への一斉配信(ブロードキャスト)のみを行い、個々の友だちを識別・追跡する情報(ユーザーID等)を扱わない(requirements.mdスコープ外「セグメント配信、パーソナライズ配信」)

## ログ

- ワークフロー実行ごとに、対象日付・配信対象トピック数・LINE APIへのリクエスト結果(成功/失敗)をGitHub Actionsのワークフロー実行ログに記録する(標準出力への記録で足り、追加のログ基盤は持たない。daily-publishと同じ方針)
- 配信に失敗した場合は、HTTPステータス・エラーレスポンス概要も合わせて記録する(上記エラーハンドリング「配信失敗時の記録方法」参照)
- リクエストヘッダー(`Authorization: Bearer <チャネルアクセストークン>`)はいかなる場合もログに出力しない(将来の実装変更でトークンが誤ってログに残ることを防ぐための明記)
