# タスク分解: 毎週月曜の記事自動生成・公開

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 選定結果からの公開判定(仕様: requirements.md#掲載件数の保証-3、content-selection/requirements.md#収集失敗-4、design.md「1回分の記事を生成する処理」手順3)
  - 🔴 `decidePublishOutcome(genreResults)`について次を確認するテストを書く: 採用した候補が1件以上あれば`'publish'`/採用0件で空いたジャンルがすべて`no-candidate`なら`'skip'`/採用0件で`collection-failed`のジャンルが1つ以上混在するなら`'fail'`/全ジャンルが`collection-failed`の場合も`'fail'`
  - 🟢 `app/research-digest/lib/decidePublishOutcome.ts`に実装する

- Task 2: 記事データの組み立て(仕様: requirements.md#掲載件数の保証-1・2・4、design.md「1回分の記事を生成する処理」手順5)
  - 🔴 `assembleArticle(date, activeGenres, findings, noCandidateGenres, collectionFailedGenres, failedGenres)`について次を確認するテストを書く: `id`・`date`が入る/候補なしのジャンルが`reason: 'no-candidate'`、収集失敗のジャンルが`reason: 'collection-failed'`と分類ラベル(`collectionFailureReason`)つき、生成に失敗したジャンルが`reason: 'generation-failed'`で`emptyGenres`に入る/収集失敗のジャンルに分類ラベルがない・候補なしや生成失敗のジャンルに分類ラベルがある場合は例外を投げる/研究と`emptyGenres`(3種の合計)を合わせると有効な全ジャンルと過不足なく一致する(一致しない入力では例外)/研究が0件なら例外/組み立てた記事が`parseArticle`([article-detail/tasks.md](../article-detail/tasks.md)のTask 3)を通る
  - 🟢 `app/research-digest/lib/assembleArticle.ts`に実装する

- Task 3: 記事データの書き出しCLI(仕様: design.md「エラーハンドリング」)(TDD対象外。Task 2の関数を呼んでファイルに書くだけのため)
  - `scripts/research-digest/write-article.ts`を実装する。同じ日付のファイルが既にある場合は上書きせずに非ゼロで終える

- Task 4: ワークフロー本体(仕様: design.md「実行環境の前提」「処理フロー」「収集失敗で実行を失敗させる処理」)(TDD対象外。GitHub Actionsの定義のため。分岐の判定ロジックはTask 1の`decidePublishOutcome`でテスト済みで、ここではその結果に従うだけ。future-digest-weekly.ymlと同じ構造で実装する)
  - `.github/workflows/research-digest-weekly.yml`を作る: `schedule`(`43 22 * * 0`)・`workflow_dispatch`・`workflow_run`(ci.ymlの完了)をトリガーにする
  - `publish`ジョブ: `RESEARCH_DIGEST_GH_PAT`でcheckout→Claude Code CLIのインストール→実行日(JST)の算出→ブランチ作成→`collect-and-select.ts`を実行(内部でTask 1の`decidePublishOutcome`を呼び、判定結果を`GITHUB_OUTPUT`の`outcome`に書き出す。`'fail'`のときはCLIが非ゼロ終了しジョブはここで失敗する)→`outcome=='skip'`ならここでジョブを終了(成功)/`outcome=='publish'`のときのみ`generate-content.ts`→`write-article.ts`→コミット・push・PR作成・`gh pr merge --auto --squash`
  - `record-ci-failure`ジョブ: `research-digest/articles/**`ブランチのPRでCIが失敗したとき、失敗したジョブ・ステップ名をPRにコメントする

- Task 5: Actions Secretsの準備(仕様: design.md「実行環境の前提」)(TDD対象外。手動の設定作業)
  - fine-grained PAT(このリポジトリのみ、Contents・Pull requestsのwrite)を発行し`RESEARCH_DIGEST_GH_PAT`として保存する
  - 既存の`CLAUDE_CODE_OAUTH_TOKEN`がそのまま使えることを確認する
  - `workflow_dispatch`で1回実行し、PR作成→CI→自動マージまで通ることを確認する
