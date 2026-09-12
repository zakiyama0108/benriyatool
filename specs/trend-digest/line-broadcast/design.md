# 設計: LINE公式アカウントでの新着記事自動配信

## サマリ
[weekly-publish](../weekly-publish/design.md)の週次記事PRがmainへ自動マージされた直後に、独立したGitHub Actionsワークフロー(`main`へのpushをトリガー)が、既存の「AI駆動開発ニュース」と同じLINE公式アカウント(チャネルアクセストークンを再利用)からブロードキャストメッセージを配信する。メッセージ見出しには「【週刊トレンド エンタメ編】」「【週刊トレンド カルチャー編】」の接頭辞を付け、日次のAI駆動開発ニュースと区別する。

## 実行環境の前提

配信は[weekly-publish](../weekly-publish/design.md)の`trend-digest-weekly.yml`にジョブを追加するのではなく、独立した新規ワークフロー`.github/workflows/trend-digest-line-broadcast.yml`とする(ai-dev-digest/line-broadcastと同じ設計判断)。

- **別ファイルに分ける理由**: `trend-digest-weekly.yml`の`publish`ジョブは記事PRの作成とauto-mergeの有効化までを行うが、実際のマージはそのジョブの実行が終わった後、CIの完了を待って非同期に行われる。そのため「PRがmainへ自動マージされた直後」というタイミングを`publish`ジョブの内部で待ち受けることはできない。GitHubの`push`イベント(`branches: main`、`paths: content/trend-digest/articles/*.json`)を使えば、実際にmainへマージされた瞬間をそのまま起動条件にでき、マージ完了を別途ポーリングする複雑さを避けられる(requirements.md#配信タイミング・方式-5は「同じワークフロー(または後続ジョブ)」を許容しており、別ファイルもこの要件を満たす設計判断とする)
- 配信スクリプトは既存の収集・選定スクリプトと同じ置き場所の慣習に従い`scripts/trend-digest/`配下に置く
- 配信元は新規開設せず、既存の「AI駆動開発ニュース」が使うLINE公式アカウントに相乗りする(requirements.mdビジネスルール[1])。発行済みのチャネルアクセストークンは、ai-dev-digest/line-broadcastが既にこのリポジトリのActions Secretsに保存済みの`LINE_CHANNEL_ACCESS_TOKEN`をそのまま再利用する(新しいSecretは発行しない。同一LINE公式アカウントに相乗りするため同じトークンで送信できる)
- このワークフローはGitHubへの書き込み(コミット・PR作成等)を一切行わないため、[weekly-publish](../weekly-publish/design.md)が使う書き込み用PAT(`TREND_DIGEST_GH_PAT`)は使わない。リポジトリのチェックアウトのみが必要なため、ワークフロー既定の`GITHUB_TOKEN`で足りる

## 処理フロー

### 配信タイミングをトリガーする処理
- 対象: `main`ブランチへのpush(weekly-publishの週次記事PRが自動マージされた結果として発生するpush)
- 手順:
  1. `content/trend-digest/articles/*.json`パターンに一致するファイルへの変更を含む、`main`ブランチへのpushでのみワークフローを起動する(GitHub Actionsのパスフィルタ)
  2. pushに含まれる変更のうち、**新規追加(Added)されたファイルのみ**を対象とする。既存ファイルの変更(Modified)は対象外とする(過去記事の内容を手動で修正するpush等でこのワークフローが再度起動しても、既存回の記事を再配信しないための安全策。requirements.md#配信タイミング・方式-6)
  3. 新規追加ファイルが1件もない場合は、何もせず処理を終える
  4. 新規追加ファイルが見つかった場合、そのファイル名(`<id>.json`)から対象IDを取り出し、以降の処理に渡す(通常は1件。複数件見つかった場合も同様にそれぞれのIDに対して以降の処理を順に行う)
- 関連するビジネスルール: requirements.md#配信タイミング・方式-5〜6

### 配信メッセージ本文を組み立てる処理
- 対象: 新規追加された記事データ(`content/trend-digest/articles/<id>.json`)
- 手順:
  1. 記事データを読み込み、[article-detail/design.md](../article-detail/design.md)が定めるスキーマ(`parseArticle`)でパースする(不正なデータの場合は後述エラーハンドリングに従う)
  2. `edition`に応じて、LINEメッセージ専用の見出し(`buildBroadcastTitle`)を組み立てる: `【週刊トレンド エンタメ編】<date整形>` または `【週刊トレンド カルチャー編】<date整形>`(requirements.md#配信内容-2)。これは記事詳細ページの見出し(`buildArticleTitle`。content-generation/design.md参照)とは別の文字列であり、`buildArticleTitle`をそのまま流用すると「週刊トレンド エンタメ編」という語句が重複表示されてしまうため、LINE配信専用に接頭辞+日付のみの形式にする(要件はLINEメッセージの見出し文字列の厳密な組み立て方までは指定していないため設計判断)【推測】
  3. `topics`配列の順(GENRE_ORDER順)に、各トピックの`heading`をジャンル名付きの箇条書きとして全件並べる(requirements.md#配信内容-3)。ジャンル名は`Genre`から日本語ラベル(`GENRE_LABELS`)を引いて使う
  4. 記事詳細ページのURL(`https://benriyatool.com/trend-digest/<id>`)を1本だけ末尾に付与する。トピックごとの出典URLは含めない(requirements.md#配信内容-4)
  5. 上記(見出し・トピック見出し一覧・リンク)を改行区切りの1本のテキストメッセージとして組み立てる。具体的な書式は以下とする【推測】:
     ```
     【週刊トレンド エンタメ編】2026年9月15日号

     ・【音楽】<トピック見出し1>
     ・【日本映画】<トピック見出し2>
     ・【海外ドラマ】<トピック見出し3>

     記事を読む
     https://benriyatool.com/trend-digest/2026-09-15-entertainment
     ```
  6. LINE Messaging APIのテキストメッセージには文字数上限(公式ドキュメント上5000文字)があるが、トピック件数は最大10件・各見出しも短文であるため、通常の記事データでこの上限を超過する可能性は低いと見込まれる。本specでは上限超過への特別な切り詰め処理は設けず、万一超過した場合は後述のエラーハンドリング(LINE配信APIがエラーを返した場合の扱い)に従う
- 関連するビジネスルール: requirements.md#配信内容-1〜4

### LINEブロードキャストメッセージを送信する処理
- 対象: 組み立てたメッセージ本文
- 手順:
  1. LINE Messaging APIのブロードキャストメッセージ送信エンドポイント(`POST https://api.line.me/v2/bot/message/broadcast`)へ、`Authorization: Bearer <チャネルアクセストークン>`ヘッダーを付けてリクエストする(友だち全員への一斉配信。セグメント配信は行わない。requirements.md#配信タイミング・方式-7)。実装時に[LINE Developers公式ドキュメント](https://developers.line.biz/ja/reference/messaging-api/#send-broadcast-message)でエンドポイント・リクエスト形式の最新仕様を確認する
  2. リクエストボディは`{"messages": [{"type": "text", "text": "<組み立てたメッセージ>"}]}`とする(テキストメッセージ1件のみ)
  3. レスポンスが成功(HTTPステータス200)の場合、配信成功として実行ログに記録する
  4. レスポンスが失敗の場合(月間無料通数超過によるエラー・その他一時的なAPIエラーいずれも)、リトライはせず、下記エラーハンドリングに従う
- 関連するビジネスルール: requirements.md#配信タイミング・方式-7、requirements.md#無料枠と配信失敗時の扱い-3〜4

## エラーハンドリング

- 記事データのパースに失敗した場合(通常は発生しない想定。article-detailのビルド時バリデーションを既に通過したデータのはずだが、念のため防御的に検証する)、配信を行わずワークフローのステップを異常終了させる
- LINE配信APIがエラーを返した場合(無料枠超過・一時的なAPIエラーいずれも)、リトライは行わずワークフローのそのステップを失敗として終了する(requirements.md#無料枠と配信失敗時の扱い-3〜4)。このワークフローは記事公開(weekly-publishのPRマージ)が完了した**後**に、ファイルが分離された独立のワークフローとして起動するため、配信の失敗がweekly-publishの処理(記事公開)自体に影響を及ぼす経路はそもそも存在しない(requirements.mdビジネスルール[3]相当。ai-dev-digest/line-broadcastの考え方をそのまま踏襲)
- 配信失敗時の記録方法: このワークフローはPRマージ後(PRが既にクローズ済み)に実行されるためコメント先のPRが存在しない。専用のGitHub Issue作成等の追加の通知手段は設けず、GitHub Actionsのワークフロー実行結果(失敗)と実行ログの内容で運営者が把握する方式とする(ai-dev-digest/line-broadcastと同じ考え方。無料枠と共有される点も同じで、配信失敗の発生頻度は低いと見込まれ、追加の通知基盤を持つコストに見合わないと判断した。要件[5]が定める「原因を記録し、運営者が把握できるようにする」は、失敗したステップ名・HTTPステータス・エラーレスポンス概要を実行ログに出力することで満たす)

## 関連するファイル(抜粋)

```
.github/workflows/trend-digest-line-broadcast.yml (新規: mainへのpush(content/trend-digest/articles/*.jsonの新規追加)をトリガーに配信を実行するワークフロー)
app/trend-digest/lib/buildBroadcastMessage.ts (新規: 記事データからLINE配信用のテキスト本文を組み立てる純粋関数。buildBroadcastTitleを含む)
scripts/trend-digest/broadcast-line.ts (新規: 記事データを読み込みbuildBroadcastMessageで組み立て、LINE Messaging APIへ送信するCLI)
app/trend-digest/lib/types.ts (既存: GENRE_ORDER・Genreの日本語ラベルを利用)
app/trend-digest/lib/articleSchema.ts (既存: parseArticleを利用)
content/trend-digest/articles/<id>.json (既存: 配信内容の元データ)
```

## セキュリティ

- チャネルアクセストークン(`LINE_CHANNEL_ACCESS_TOKEN`)は既存のActions Secretsをそのまま参照する(新規の保存作業は発生しない)。漏えい時は運営者がLINE Developersコンソールでトークンを再発行し、Secretsを更新する運用とする(ai-dev-digestと共有のトークンのため、更新するとai-dev-digestの配信にも影響する点に留意する)
- このワークフローはGitHubへの書き込み(コミット・PR作成等)を一切行わないため、書き込み用PAT(`TREND_DIGEST_GH_PAT`)は使わない。リポジトリのチェックアウトにはワークフロー既定の読み取り専用`GITHUB_TOKEN`を使う
- 配信メッセージの本文は記事データ(開発者・エージェントが作成しリポジトリにコミットされるコンテンツ)のみから組み立てられ、訪問者からの入力を一切含まない
- 配信は友だち全員への一斉配信(ブロードキャスト)のみを行い、個々の友だちを識別・追跡する情報(ユーザーID等)を扱わない(requirements.mdスコープ外「セグメント配信、パーソナライズ配信」)

## ログ

- ワークフロー実行ごとに、対象ID・配信対象トピック数・LINE APIへのリクエスト結果(成功/失敗)をGitHub Actionsのワークフロー実行ログに記録する
- 配信に失敗した場合は、HTTPステータス・エラーレスポンス概要も合わせて記録する
- リクエストヘッダー(`Authorization: Bearer <チャネルアクセストークン>`)はいかなる場合もログに出力しない
