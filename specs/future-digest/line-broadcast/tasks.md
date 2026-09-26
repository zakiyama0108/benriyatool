# タスク分解: LINE公式アカウントでの新着記事の自動配信

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 代表見出しの選択(仕様: requirements.md#配信内容-3〜5、design.md「代表見出しを選ぶ処理」)
  - 🔴 `selectRepresentatives(article)`について次を確認するテストを書く: ジャンルごとに影響度の最も大きい予測が選ばれる/同じ影響度が2本なら時間軸の近い方が選ばれる/性・恋愛ジャンルは含まれない/予測が1本もないジャンルは含まれない/影響度の大きい順、同じ影響度ではジャンル順に並ぶ
  - 🟢 `app/future-digest/lib/buildBroadcastMessage.ts`に実装する

- Task 2: 記事URLの導出(仕様: requirements.md#配信内容-6)
  - 🔴 記事IDから`https://benriyatool.com/future-digest/<id>`が作られることを確認するテストを書く
  - 🟢 `app/future-digest/lib/articleUrl.ts`に`buildArticleUrl(article)`を実装する(`app/lib/site.ts`の`SITE_URL`を使う)

- Task 3: 配信メッセージの組み立て(仕様: requirements.md#配信内容-1〜2・6、design.md「配信メッセージを組み立てる処理」)
  - 🔴 1行目が「【週刊未来予測】2026年10月1日号」、2行目がその回の時間軸(例:「今回の時間軸: 近未来・長期未来」)になること、代表見出しが「・【影響度 大/ジャンル名】見出し」の形で並ぶこと、末尾のURLが`buildArticleUrl`と一致し1本だけであること、出典URLを含まないこと、性・恋愛ジャンルの見出しを含まないこと、代表見出しが0件でもタイトル・時間軸・リンクで組み立てられることを確認するテストを書く
  - 🟢 `buildBroadcastTitle(date)`・`buildBroadcastMessage(article)`を実装する

- Task 4: 配信CLI(仕様: design.md「配信する処理」「エラーハンドリング」)
  - 🔴 `fetch`をモックし、公開確認のGETが200を返したあとにLINE APIへ1回だけPOSTすること、公開確認が時間切れならLINE APIを呼ばずに失敗すること、LINE APIの失敗時はリトライせず失敗することを確認するテストを書く(待ち時間・`sleep`は引数で差し替えられるようにする)
  - 🟢 `scripts/future-digest/broadcast-line.ts`を実装する(記事の読み込み→`parseArticle`→`buildBroadcastMessage`→`waitForPageAvailable`→`POST /v2/bot/message/broadcast`。試行ごとの経過秒数とHTTPステータスを`console.error`で出す)

- Task 5: ワークフロー本体(仕様: design.md「実行環境の前提」「配信対象の記事を決める処理」)(TDD対象外。GitHub Actionsの定義のため。trend-digest-line-broadcast.ymlと同じ構造で実装する)
  - `.github/workflows/future-digest-line-broadcast.yml`を作る: `push`(`branches: [main]`、`paths: content/future-digest/articles/*.json`)では新規追加されたファイルだけを対象に、`workflow_dispatch`(記事ID入力)では新規追加ファイルの判定を行わず入力された記事IDを対象に、Task 4のCLIを実行する。`LINE_CHANNEL_ACCESS_TOKEN`は既存のSecretを参照する

- Task 6: 本番での通し確認(仕様: requirements.md#配信タイミング・方式-7〜8)(TDD対象外。手動確認)
  - 初回の週次記事のマージで配信ワークフローが動き、実行ログに公開待ちの試行記録が残ること、届いたLINEのリンクで記事ページが開けること、性・恋愛ジャンルの見出しが載っていないことを確認する
