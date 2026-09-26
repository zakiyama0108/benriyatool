# 設計: LINE公式アカウントでの新着記事の自動配信

## サマリ
[weekly-publish](../weekly-publish/design.md)の週次記事PRがmainへ自動マージされると、`main`へのpush(記事JSONの新規追加)をきっかけに独立したワークフローが起動する。記事ページが本番で開けることを確認してから、既存の「AI駆動開発ニュース」のLINE公式アカウントで友だち全員にブロードキャスト配信する。本文は「【週刊未来予測】」+日付・その回の時間軸・ジャンルごとの代表見出し(影響度順、性・恋愛と候補なしのジャンルは除く)・記事ページへのリンク1本で組み立てる。

主要な設計判断:
- 配信の仕組み(pushトリガー・新規追加ファイルだけを対象・公開待ち・リトライしない)はtrend-digestのline-broadcastと同じ構成で、共有モジュール`app/lib/waitForPageAvailable.ts`をそのまま使う
- ジャンルの代表見出しは、そのジャンルで影響度が最も大きい1本とし、同じ影響度が2本ある場合は時間軸の近い方を選ぶ
- 図: [配信する処理](#配信する処理)のシーケンス図

## 実行環境の前提

- ワークフローは`.github/workflows/future-digest-line-broadcast.yml`として、週次ワークフローとは別ファイルにする(マージはCIの完了後に非同期で起こるため、mainへのpushを起動条件にする方が確実。trend-digestと同じ理由)
- 起動条件は`main`へのpushのうち`content/future-digest/articles/*.json`を含むものと、`workflow_dispatch`(記事ID指定)とする
- チャネルアクセストークンは既存の`LINE_CHANNEL_ACCESS_TOKEN`をそのまま使う(同じLINE公式アカウントに相乗りするため。requirements.md#アカウント・配信主体-1)
- GitHubへの書き込みはしないため、既定の`GITHUB_TOKEN`(読み取り)で足りる

## 処理フロー

### 配信対象の記事を決める処理
- 対象: `main`へのpush、または運営者による`workflow_dispatch`(記事ID指定)
- 手順:
  1. `main`へのpushで起動した場合は、**新規追加された**`content/future-digest/articles/*.json`だけを対象にする。既存ファイルの修正では配信しない(過去の回を再配信しないため。requirements.md#配信タイミング・方式-9)。新規追加がなければ何もせず終える
  2. `workflow_dispatch`(記事ID指定)で起動した場合は、新規追加ファイルの判定は行わず、入力された記事IDをそのまま対象にする。運営者が自動配信の失敗に気づいて手動で起動する運用のため、指定された記事データが存在しない場合は失敗として終える(requirements.md#配信タイミング・方式-10)【推測】
  3. ファイル名(またはworkflow_dispatchの入力)から記事IDを取り出し、以降の処理に渡す
  4. 「1本の記事につき再送は1回まで」は、ワークフロー側で送信回数を記録・検証する仕組みは設けず、運営者が手動起動する際に守る運用上のルールとする(自動配信は`main`へのpushでしか起きず、再送は運営者の意図的な操作に限られるため。requirements.md#配信タイミング・方式-10)【推測】
- 関連するビジネスルール: requirements.md#配信タイミング・方式-7・9〜10

### 代表見出しを選ぶ処理
- 対象: 1回分の記事データ
- 手順:
  1. 予測をジャンルごとにまとめる。予測が1本もないジャンル(候補なし・収集失敗・生成失敗のみ)は対象外にする(requirements.md#配信内容-5)
  2. `genres.json`の`lineExcluded: true`のジャンル(現在は性・恋愛のみ)は対象外にする。ジャンルIDを直接比較するコードは書かない(requirements.md#配信内容-4、content-selection/design.md#データ設計ジャンル注目テーマの設定ファイル)
  3. 各ジャンルで影響度の最も大きい予測を代表にする。同じ影響度が2本ある場合は、時間軸の近い方を代表にする(requirements.md#配信内容-3)
  4. 代表見出しを影響度の大きい順に並べ、同じ影響度の中ではジャンル順に並べる(requirements.md#配信内容-5)
- 関連するビジネスルール: requirements.md#配信内容-3〜5

### 配信メッセージを組み立てる処理
- 対象: 1回分の記事データと代表見出し
- 手順:
  1. 1行目を「【週刊未来予測】YYYY年M月D日号」、2行目を「今回の時間軸: 近未来・長期未来」のようにする(requirements.md#配信内容-2)
  2. 代表見出しを「・【影響度 大/ジャンル名】見出し」の形で1行ずつ並べる(requirements.md#配信内容-3)
  3. 末尾に「記事を読む」と記事詳細ページのURL(`https://benriyatool.com/future-digest/<id>`)を1本だけ付ける。予測ごとの出典URLは含めない(requirements.md#配信内容-6)
  4. 書式の例:
     ```
     【週刊未来予測】2026年10月1日号
     今回の時間軸: 近未来・長期未来

     ・【影響度 大/テクノロジー・AI】<見出し>
     ・【影響度 大/医療・健康】<見出し>
     ・【影響度 中/地政学】<見出し>

     記事を読む
     https://benriyatool.com/future-digest/2026-10-01
     ```
  5. 代表見出しは有効なジャンルの数(性・恋愛を除く。現在は最大9件)で各見出しも短いため、LINEのテキストメッセージの文字数上限(5000字)を超えない見込み。切り詰め処理は設けず、万一超えた場合はAPIのエラーとして下記エラーハンドリングに従う
- 関連するビジネスルール: requirements.md#配信内容-1〜6

### 配信する処理
- 対象: 組み立てたメッセージ
- 手順:
  1. 記事詳細ページのURLが本番で開けるまで待つ(`app/lib/waitForPageAvailable.ts`。待ち方・待ち時間はai-dev-digest・trend-digestと共通)。待ち時間のうちに開けなければ、LINEには送らず失敗として終える(requirements.md#配信タイミング・方式-7〜8)
  2. LINE Messaging APIのブロードキャスト送信(`POST https://api.line.me/v2/bot/message/broadcast`)で、テキストメッセージ1件を友だち全員に送る(requirements.md#配信タイミング・方式-9)
  3. 失敗した場合(無料枠の超過・一時的なエラーのいずれも)はリトライせず、失敗として終える(requirements.md#無料枠と配信失敗時の扱い-4)
- シーケンス図(俯瞰用。正は上記の手順の文章):

```mermaid
sequenceDiagram
    participant gh as mainへのpush
    participant wf as 配信ワークフロー
    participant site as 本番サイト(benriyatool.com)
    participant line as LINE Messaging API

    gh ->> wf: 記事JSONの新規追加で起動
    wf ->> wf: 代表見出しを選びメッセージを組み立てる
    loop 公開を確認できるまで(待ち時間まで)
        wf ->> site: 記事ページをGET
        site -->> wf: HTTPステータス
    end
    alt 公開を確認できた
        wf ->> line: ブロードキャスト送信
        line -->> wf: 結果(失敗してもリトライしない)
    else 時間切れ
        wf ->> wf: 送らずに失敗として終える
    end
```
- 関連するビジネスルール: requirements.md#配信タイミング・方式-7〜9、requirements.md#無料枠と配信失敗時の扱い-2〜4

## エラーハンドリング

- 公開を待ち時間のうちに確認できない場合は送らない(開けないリンクを送るより、その回の配信が飛ぶ方を選ぶ。trend-digestと同じ)。最後に観測したHTTPステータスと経過時間を実行ログに残す
- 記事データの読み込み・検証に失敗した場合は送らずに失敗として終える(通常はビルド時検証を通っているため起きない想定の防御)
- 代表見出しが1件もない場合(予測が性・恋愛ジャンルだけだった回)も、タイトルと時間軸と記事リンクだけのメッセージとして送る(記事は公開されており、リンクからは読めるため)
- LINE APIの失敗はリトライせず、失敗したステップ・HTTPステータス・エラー概要を実行ログに残し、ワークフローを失敗表示にする。記事の公開はこのワークフローより前に完了しているため影響しない(requirements.md#無料枠と配信失敗時の扱い-4)

## 関連するファイル(抜粋)

```
.github/workflows/future-digest-line-broadcast.yml (新規)
app/future-digest/lib/buildBroadcastMessage.ts (新規: selectRepresentatives・buildBroadcastTitle・buildBroadcastMessage)
app/future-digest/lib/articleUrl.ts (新規: 記事詳細ページのURLの導出。配信本文と公開待ちで共有する)
scripts/future-digest/broadcast-line.ts (新規: 記事を読み込み、公開待ち→LINEへ送信するCLI)
app/lib/waitForPageAvailable.ts (既存: 公開待ちの共有モジュール)
app/lib/site.ts (既存: SITE_URL)
app/future-digest/lib/articleSchema.ts (article-detailで新規: parseArticleを利用)
```

## セキュリティ

- `LINE_CHANNEL_ACCESS_TOKEN`は既存のActions Secretsを参照する。ai-dev-digestほか既存のdigestと共有のため、再発行するとそれらの配信にも影響する
- `Authorization`ヘッダーはどのログにも出さない。公開待ちのGETには認証情報を付けない
- メッセージはリポジトリにコミットされた記事データだけから組み立て、訪問者の入力を含まない
- 性・恋愛ジャンルの見出しはメッセージに含めない(requirements.md#配信内容-4)。代表見出しの選び方の段階で除くため、組み立て処理が見出しを扱うことはない
- 友だち全員へのブロードキャストのみで、個々のユーザーIDは扱わない

## ログ

- 実行ごとに、記事ID・代表見出しの件数・公開待ちの試行ごとの経過秒数とHTTPステータス・LINE APIの結果(成功/失敗とHTTPステータス)をワークフローの実行ログに出す
- 失敗時は、失敗の理由(時間切れ/記事データ不正/LINE APIのエラー概要)をエラーとして出す
