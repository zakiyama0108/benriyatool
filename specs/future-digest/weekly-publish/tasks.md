# タスク分解: 毎週木曜の記事自動生成・公開

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 記事データの組み立て(仕様: requirements.md#掲載件数の保証-1〜2、design.md「1回分の記事を生成する処理」手順5)
  - 🔴 `assembleArticle(date, issueNumber, activeGenres, predictions, noCandidateSlots, failedSlots)`について次を確認するテストを書く: `id`・`date`・`issueNumber`が入る/候補なしの枠が`reason: 'no-candidate'`、生成に失敗した枠が`reason: 'generation-failed'`で`emptySlots`に入る/予測と`emptySlots`を合わせると有効な全ジャンル×その回の2時間軸と過不足なく一致する(一致しない入力では例外)/予測が0件なら例外/組み立てた記事が`parseArticle`([article-detail/tasks.md](../article-detail/tasks.md)のTask 3)を通る
  - 🟢 `app/future-digest/lib/assembleArticle.ts`に実装する

- Task 2: 記事データの書き出しCLI(仕様: design.md「関連するファイル」「エラーハンドリング」)(TDD対象外。Task 1の関数を呼んでファイルに書くだけのため)
  - `scripts/future-digest/write-article.ts`を実装する。同じ日付のファイルが既にある場合は上書きせずに非ゼロで終える

- Task 3: ワークフロー本体(仕様: design.md「実行環境の前提」「1回分の記事を生成する処理」「PRを作成しCIの結果を待つ処理」「PRを自動マージする処理」「CI失敗時に記録する処理」「公開をスキップする処理」)(TDD対象外。GitHub Actionsの定義のため。trend-digest-weekly.ymlと同じ構造で実装する)
  - `.github/workflows/future-digest-weekly.yml`を作る: `schedule`(`43 22 * * 3`)・`workflow_dispatch`・`workflow_run`(ci.ymlの完了)をトリガーにする
  - `publish`ジョブ: `FUTURE_DIGEST_GH_PAT`でcheckout→Claude Code CLIのインストール→実行日(JST)の算出→ブランチ作成→`collect-and-select.ts`→全枠候補なしならスキップ(成功で終了)→`generate-content.ts`→`write-article.ts`→コミット・push・PR作成・`gh pr merge --auto --squash`
  - `record-ci-failure`ジョブ: `future-digest/articles/**`ブランチのPRでCIが失敗したとき、失敗したジョブ・ステップ名をPRにコメントする

- Task 4: Actions Secretsの準備(仕様: design.md「実行環境の前提」)(TDD対象外。手動の設定作業)
  - fine-grained PAT(このリポジトリのみ、Contents・Pull requestsのwrite)を発行し`FUTURE_DIGEST_GH_PAT`として保存する
  - 既存の`CLAUDE_CODE_OAUTH_TOKEN`がそのまま使えることを確認する
  - `workflow_dispatch`で1回実行し、PR作成→CI→自動マージまで通ることを確認する
