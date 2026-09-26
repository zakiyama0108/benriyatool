# タスク分解: LINE公式アカウントでの新着記事の自動配信

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 記事URLの導出(仕様: requirements.md#配信内容-5)
  - 🔴 記事IDから`https://benriyatool.com/research-digest/<id>`が作られることを確認するテストを書く
  - 🟢 `app/research-digest/lib/articleUrl.ts`に`buildArticleUrl(article)`を実装する(`app/lib/site.ts`の`SITE_URL`を使う)

- Task 2: 配信メッセージの組み立て(仕様: requirements.md#配信内容-1〜5、design.md「配信メッセージを組み立てる処理」)
  - 🔴 1行目が「【週刊研究発見】2026年10月5日号」になること、掲載した研究の見出しがすべて「・【影響度 大/ジャンル名】見出し」の形で載ること、影響度の大きい順・同じ影響度ではジャンル順に並ぶこと、候補なし・収集失敗・生成失敗のジャンルが載らないこと、末尾のURLが`buildArticleUrl`と一致し1本だけであること、出典URLを含まないことを確認するテストを書く
  - 🟢 `app/research-digest/lib/buildBroadcastMessage.ts`に`buildBroadcastTitle(date)`・`buildBroadcastMessage(article)`を実装する

- Task 3: 配信CLI(仕様: design.md「配信する処理」「エラーハンドリング」)
  - 🔴 `fetch`をモックし、公開確認のGETが200を返したあとにLINE APIへ1回だけPOSTすること、公開確認が時間切れならLINE APIを呼ばずに失敗すること、LINE APIの失敗時はリトライせず失敗すること、指定された記事IDのデータが存在しない場合はLINE APIを呼ばずに失敗することを確認するテストを書く(待ち時間・`sleep`は引数で差し替えられるようにする)
  - 🟢 `scripts/research-digest/broadcast-line.ts`を実装する(記事の読み込み→`parseArticle`→`buildBroadcastMessage`→`waitForPageAvailable`→`POST /v2/bot/message/broadcast`。試行ごとの経過秒数とHTTPステータスを`console.error`で出す)

- Task 4: ワークフロー本体(仕様: design.md「実行環境の前提」「配信対象の記事を決める処理」)(TDD対象外。GitHub Actionsの定義のため。trend-digest-line-broadcast.ymlと同じ構造で実装する)
  - `.github/workflows/research-digest-line-broadcast.yml`を作る: `push`(`branches: [main]`、`paths: content/research-digest/articles/*.json`)では新規追加されたファイルだけを対象に、`workflow_dispatch`(記事ID入力)では新規追加ファイルの判定を行わず入力された記事IDを対象に、Task 3のCLIを実行する。`LINE_CHANNEL_ACCESS_TOKEN`は既存のSecretを参照する

- Task 5: 本番での通し確認(仕様: requirements.md#配信タイミング・方式-6〜7)(TDD対象外。手動確認)
  - 初回の週次記事のマージで配信ワークフローが動き、実行ログに公開待ちの試行記録が残ること、届いたLINEのリンクで記事ページが開けることを確認する
