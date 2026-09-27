# タスク分解: 毎週月曜の記事自動生成・公開

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 選定結果からの運営者への警告判定(仕様: requirements.md#掲載件数の保証-3、content-selection/requirements.md#収集失敗-4、design.md「1回分の記事を生成する処理」手順2)
  - 🔴 `shouldAlertOperator(genreResults)`について次を確認するテストを書く: 全ジャンルが`collection-failed`なら`true`/採用した候補が1件以上ある・`no-candidate`のジャンルが1つ以上混在する等、`collection-failed`以外のジャンルが1つでもあれば`false`(採用0件で全ジャンル`no-candidate`の場合を含む)
  - 🟢 `app/research-digest/lib/shouldAlertOperator.ts`に実装する

- Task 2: 記事データの組み立て(仕様: requirements.md#掲載件数の保証-1・2・4、design.md「1回分の記事を生成する処理」手順5)
  - 🔴 `assembleArticle(date, activeGenres, findings, noCandidateGenres, collectionFailedGenres, failedGenres)`について次を確認するテストを書く: `id`・`date`が入る/候補なしのジャンルが`reason: 'no-candidate'`、収集失敗のジャンルが`reason: 'collection-failed'`と分類ラベル(`collectionFailureReason`)つき、生成に失敗したジャンルが`reason: 'generation-failed'`で`emptyGenres`に入る/収集失敗のジャンルに分類ラベルがない・候補なしや生成失敗のジャンルに分類ラベルがある場合は例外を投げる/研究と`emptyGenres`(3種の合計)を合わせると有効な全ジャンルと過不足なく一致する(一致しない入力では例外)/研究が0件(全ジャンルが`no-candidate`・`collection-failed`・`generation-failed`のいずれか)でも組み立てられる/組み立てた記事が`parseArticle`([article-detail/tasks.md](../article-detail/tasks.md)のTask 3)を通る
  - 🟢 `app/research-digest/lib/assembleArticle.ts`に実装する

- Task 3: 記事データの書き出しCLI(仕様: design.md「エラーハンドリング」)(TDD対象外。Task 2の関数を呼んでファイルに書くだけのため)
  - `scripts/research-digest/write-article.ts`を実装する。同じ日付のファイルが既にある場合は上書きせずに非ゼロで終える

- Task 4: 配信日の算出と再実行cronの冪等チェック(仕様: requirements.md#利用上限への到達時の再実行-2・5、design.md「配信日を求める処理」「利用上限への到達時に再実行する処理」手順1)
  - 🔴 `getScheduledPublishDate(nowUtc)`(UTCの`Date`を受け取り、関数の内側でJSTに変換してから直近の月曜を求める)について次を確認するテストを書く: 月曜07:43 JST相当のUTC日時を渡すとその日の日付が返る/月曜19:43・火曜07:43・火曜19:43(いずれもJSTの3本の再実行cronの起動時刻をUTCに換算した日時)を渡すと同じ週の月曜の日付が返る/週をまたいだ月曜(次の月曜)は返らない/境界値として、日曜22:43 UTC(=月曜07:43 JST)を渡すと同じ週の月曜の日付が返る
  - 🟢 `app/research-digest/lib/scheduledPublishDate.ts`に実装する
  - 🔴 `validateScheduledPublishDate(value)`について次を確認するテストを書く: `YYYY-MM-DD`形式かつ実在する月曜日(JST)なら妥当/形式が違う・日付として存在しない・月曜日でない場合はいずれも不正(仕様: design.md「セキュリティ」)
  - 🟢 同じ`app/research-digest/lib/scheduledPublishDate.ts`に実装する
  - 🔴 `shouldSkipRetry(articles, scheduledPublishDate)`について次を確認するテストを書く: 指定した配信日と同じ`date`の記事が既にあれば`true`(スキップ)/なければ`false`(再実行してよい)
  - 🟢 `app/research-digest/lib/shouldSkipRetry.ts`に実装する

- Task 5: ワークフロー本体(仕様: design.md「実行環境の前提」「配信日を求める処理」「処理フロー」「利用上限への到達時に再実行する処理」「収集失敗を運営者に警告する処理」「セキュリティ」)(TDD対象外。GitHub Actionsの定義のため。分岐の判定ロジックはTask 1の`shouldAlertOperator`・Task 4の`getScheduledPublishDate`・`validateScheduledPublishDate`・`shouldSkipRetry`でテスト済みで、ここではその結果に従うだけ。future-digest-weekly.ymlと同じ構造で実装する)
  - `.github/workflows/research-digest-weekly.yml`を作る: `schedule`(本番cron`43 22 * * 0`、再実行cron`43 10 * * 1`・`43 22 * * 1`・`43 10 * * 2`の3本)・`workflow_dispatch`(入力`scheduled_publish_date`省略可)・`workflow_run`(ci.ymlの完了)をトリガーにする。`scheduled_publish_date`は`run:`に直接埋め込まず`env:`経由でステップに渡す
  - `publish`ジョブ: 実行日時(JST)からTask 4の`getScheduledPublishDate`で配信日を求める(`workflow_dispatch`で`scheduled_publish_date`が入力されていれば、`validateScheduledPublishDate`で検証したうえでそれを優先。検証に失敗した場合はここでジョブを非ゼロ終了する)→再実行cronで起動した場合はまず`shouldSkipRetry`と`gh pr list`(オープン・マージ済み・クローズ済み)でスキップ判定を行い、スキップならここで成功終了する→(本番cron、または再実行で継続する場合)`RESEARCH_DIGEST_GH_PAT`でcheckout→Claude Code CLIのインストール→配信日を使ってブランチ作成→`collect-and-select.ts`を実行(内部でTask 1の`shouldAlertOperator`を呼び、判定結果を`GITHUB_OUTPUT`の`alert`に書き出す。利用上限への到達を検知した場合はここより前にCLIが非ゼロ終了しジョブはここで失敗し、次の再実行cronに委ねる)→採用件数にかかわらず`generate-content.ts`(候補0件なら何もしない。利用上限への到達を検知した場合はここで非ゼロ終了し後続の`write-article.ts`には進まず、次の再実行cronに委ねる)→`write-article.ts`→コミット・push・PR作成・`gh pr merge --auto --squash`→`alert=='true'`ならここでジョブを非ゼロ終了(公開後の失敗表示)
  - `record-ci-failure`ジョブ: `research-digest/articles/**`ブランチのPRでCIが失敗したとき、失敗したジョブ・ステップ名をPRにコメントする

- Task 6: Actions Secretsの準備(仕様: design.md「実行環境の前提」)(TDD対象外。手動の設定作業)
  - fine-grained PAT(このリポジトリのみ、Contents・Pull requestsのwrite)を発行し`RESEARCH_DIGEST_GH_PAT`として保存する
  - 既存の`CLAUDE_CODE_OAUTH_TOKEN`がそのまま使えることを確認する
  - `workflow_dispatch`で1回実行し、PR作成→CI→自動マージまで通ることを確認する(動作確認用途。復旧用途で使う場合は`scheduled_publish_date`を指定する)
