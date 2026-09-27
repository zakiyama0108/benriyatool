# タスク分解: 毎週木曜の記事自動生成・公開

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 選定結果からの運営者への警告判定(仕様: requirements.md#掲載件数の保証-3、content-selection/requirements.md#収集失敗-4、design.md「1回分の記事を生成する処理」手順2)
  - 🔴 `shouldAlertOperator(slotResults)`について次を確認するテストを書く: 全枠(有効なジャンル数×2時間軸)が`collection-failed`なら`true`/採用した候補が1件以上ある・`no-candidate`の枠が1つ以上混在する等、`collection-failed`以外の枠が1つでもあれば`false`(採用0件で全枠`no-candidate`の場合を含む)
  - 🟢 `app/future-digest/lib/shouldAlertOperator.ts`に実装する

- Task 2: 記事データの組み立て(仕様: requirements.md#掲載件数の保証-1・2・4、design.md「1回分の記事を生成する処理」手順5)
  - 🔴 `assembleArticle(date, issueNumber, activeGenres, predictions, noCandidateSlots, collectionFailedSlots, failedSlots)`について次を確認するテストを書く: `id`・`date`・`issueNumber`が入る/候補なしの枠が`reason: 'no-candidate'`、収集失敗の枠が`reason: 'collection-failed'`と分類ラベル(`collectionFailureReason`)つき、生成に失敗した枠が`reason: 'generation-failed'`で`emptySlots`に入る/収集失敗の枠に分類ラベルがない・候補なしや生成失敗の枠に分類ラベルがある場合は例外を投げる/予測と`emptySlots`(3種の合計)を合わせると有効な全ジャンル×その回の2時間軸と過不足なく一致する(一致しない入力では例外)/予測が0件(全枠が`no-candidate`・`collection-failed`・`generation-failed`のいずれか)でも組み立てられる/組み立てた記事が`parseArticle`([article-detail/tasks.md](../article-detail/tasks.md)のTask 3)を通る
  - 🟢 `app/future-digest/lib/assembleArticle.ts`に実装する

- Task 3: 記事データの書き出しCLI(仕様: design.md「関連するファイル」「エラーハンドリング」)(TDD対象外。Task 2の関数を呼んでファイルに書くだけのため)
  - `scripts/future-digest/write-article.ts`を実装する。同じ日付のファイルが既にある場合は上書きせずに非ゼロで終える

- Task 4: ワークフロー本体(仕様: design.md「実行環境の前提」「1回分の記事を生成する処理」「PRを作成しCIの結果を待つ処理」「PRを自動マージする処理」「CI失敗時に記録する処理」「収集失敗を運営者に警告する処理」)(TDD対象外。GitHub Actionsの定義のため。分岐の判定ロジックはTask 1の`shouldAlertOperator`でテスト済みで、ここではその結果に従うだけ。trend-digest-weekly.ymlと同じ構造で実装する)
  - `.github/workflows/future-digest-weekly.yml`を作る: `schedule`(`43 22 * * 3`)・`workflow_dispatch`・`workflow_run`(ci.ymlの完了)をトリガーにする
  - `publish`ジョブ: `FUTURE_DIGEST_GH_PAT`でcheckout→Claude Code CLIのインストール→実行日(JST)の算出→ブランチ作成→`collect-and-select.ts`を実行(内部でTask 1の`shouldAlertOperator`を呼び、判定結果を`GITHUB_OUTPUT`の`alert`に書き出す。利用上限への到達を検知した場合はここより前にCLIが非ゼロ終了しジョブはここで失敗する)→採用件数にかかわらず`generate-content.ts`(候補0件なら何もしない)→`write-article.ts`→コミット・push・PR作成・`gh pr merge --auto --squash`→`alert=='true'`ならここでジョブを非ゼロ終了(公開後の警告表示)
  - `record-ci-failure`ジョブ: `future-digest/articles/**`ブランチのPRでCIが失敗したとき、失敗したジョブ・ステップ名をPRにコメントする

- Task 5: Actions Secretsの準備(仕様: design.md「実行環境の前提」)(TDD対象外。手動の設定作業)
  - fine-grained PAT(このリポジトリのみ、Contents・Pull requestsのwrite)を発行し`FUTURE_DIGEST_GH_PAT`として保存する
  - 既存の`CLAUDE_CODE_OAUTH_TOKEN`がそのまま使えることを確認する
  - `workflow_dispatch`で1回実行し、PR作成→CI→自動マージまで通ることを確認する
