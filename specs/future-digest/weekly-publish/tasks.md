# タスク分解: 週2回の記事自動生成・公開

> 全8件(Task 1〜Task 8)
> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 選定結果からの運営者への警告判定(仕様: requirements.md#掲載件数の保証-3、content-selection/requirements.md#収集失敗-4、design.md「1回分の記事を生成する処理」手順2)
  - 🔴 `shouldAlertOperator(slotResults)`について次を確認するテストを書く: 全枠(有効なジャンル数×2時間軸)が`collection-failed`なら`true`/採用した候補が1件以上ある・`no-candidate`の枠が1つ以上混在する等、`collection-failed`以外の枠が1つでもあれば`false`(採用0件で全枠`no-candidate`の場合を含む)
  - 🟢 `app/future-digest/lib/shouldAlertOperator.ts`に実装する

- Task 2: 記事データの組み立て(仕様: requirements.md#掲載件数の保証-1・2・4、design.md「1回分の記事を生成する処理」手順5)
  - 🔴 `assembleArticle(date, issueNumber, activeGenres, predictions, noCandidateSlots, collectionFailedSlots, failedSlots)`について次を確認するテストを書く: `id`・`date`・`issueNumber`が入る/候補なしの枠が`reason: 'no-candidate'`、収集失敗の枠が`reason: 'collection-failed'`と分類ラベル(`collectionFailureReason`)つき、生成に失敗した枠が`reason: 'generation-failed'`で`emptySlots`に入る/収集失敗の枠に分類ラベルがない・候補なしや生成失敗の枠に分類ラベルがある場合は例外を投げる/予測と`emptySlots`(3種の合計)を合わせると有効な全ジャンル×その回の2時間軸と過不足なく一致する(一致しない入力では例外)/予測が0件(全枠が`no-candidate`・`collection-failed`・`generation-failed`のいずれか)でも組み立てられる/組み立てた記事が`parseArticle`([article-detail/tasks.md](../article-detail/tasks.md)のTask 3)を通る
  - 🟢 `app/future-digest/lib/assembleArticle.ts`に実装する

- Task 3: 記事データの書き出しCLI(仕様: design.md「関連するファイル」「エラーハンドリング」)(TDD対象外。Task 2の関数を呼んでファイルに書くだけのため)
  - `scripts/future-digest/write-article.ts`を実装する。同じ日付のファイルが既にある場合は上書きせずに非ゼロで終える

- Task 4: 配信日の算出と再実行cronの冪等チェック(仕様: requirements.md#利用上限への到達時の再実行-2・5、design.md「配信日を求める処理」「利用上限への到達時に再実行する処理」手順1)
  - 🔴 `getScheduledPublishDate(nowUtc)`(UTCの`Date`を受け取り、関数の内側でJSTに変換してから直近の木曜を求める)について次を確認するテストを書く: 木曜07:43 JST相当のUTC日時を渡すとその日の日付が返る/木曜19:43・金曜07:43・金曜19:43(いずれもJSTの3本の再実行cronの起動時刻をUTCに換算した日時)を渡すと同じ週の木曜の日付が返る/週をまたいだ木曜(次の木曜)は返らない/境界値として、水曜22:43 UTC(=木曜07:43 JST)を渡すと同じ週の木曜の日付が返る
  - 🟢 `app/future-digest/lib/scheduledPublishDate.ts`に実装する
  - 🔴 `validateScheduledPublishDate(value)`について次を確認するテストを書く: `YYYY-MM-DD`形式かつ実在する木曜日(JST)なら妥当/形式が違う・日付として存在しない・木曜日でない場合はいずれも不正(仕様: design.md「セキュリティ」)
  - 🟢 同じ`app/future-digest/lib/scheduledPublishDate.ts`に実装する
  - 🔴 `shouldSkipRetry(articles, scheduledPublishDate)`について次を確認するテストを書く: 指定した配信日と同じ`date`の記事が既にあれば`true`(スキップ)/なければ`false`(再実行してよい)
  - 🟢 `app/future-digest/lib/shouldSkipRetry.ts`に実装する

- Task 5: ワークフロー本体(仕様: design.md「実行環境の前提」「配信日を求める処理」「1回分の記事を生成する処理」「利用上限への到達時に再実行する処理」「PRを作成しCIの結果を待つ処理」「PRを自動マージする処理」「CI失敗時に記録する処理」「収集失敗を運営者に警告する処理」「セキュリティ」)(TDD対象外。GitHub Actionsの定義のため。分岐の判定ロジックはTask 1の`shouldAlertOperator`・Task 4の`getScheduledPublishDate`・`validateScheduledPublishDate`・`shouldSkipRetry`でテスト済みで、ここではその結果に従うだけ。trend-digest-weekly.ymlと同じ構造で実装する)
  - `.github/workflows/future-digest-weekly.yml`を作る: `schedule`(本番cron`43 22 * * 3`、再実行cron`43 10 * * 4`・`43 22 * * 4`・`43 10 * * 5`の3本)・`workflow_dispatch`(入力`scheduled_publish_date`省略可)・`workflow_run`(ci.ymlの完了)をトリガーにする。`scheduled_publish_date`は`run:`に直接埋め込まず`env:`経由でステップに渡す
  - `publish`ジョブ(`if: github.event_name != 'workflow_run'`で`workflow_run`では起動しない。`workflow_run`は下の`record-ci-failure`ジョブ専用で、既存のweekly系ワークフローと同じ): まず`FUTURE_DIGEST_GH_PAT`でcheckoutする(`shouldSkipRetry`が記事ファイルの有無を確認するために必要なため、スキップ判定より先に行う)→実行日時(UTCのまま渡し、JSTへの変換は関数の内側で行う)からTask 4の`getScheduledPublishDate`で配信日を求める(`workflow_dispatch`で`scheduled_publish_date`が入力されていれば、`validateScheduledPublishDate`で検証したうえでそれを優先。検証に失敗した場合はここでジョブを非ゼロ終了する)→`github.event.schedule`の値を3本の再実行cron式(`43 10 * * 4`・`43 22 * * 4`・`43 10 * * 5`)のいずれかと比較して本番か再実行かを判別する(本番cronの値・`workflow_dispatch`はいずれも再実行cronではないため通常どおり続行する)。再実行cronだった場合はまず`shouldSkipRetry`と`gh pr list`(オープン・マージ済み・クローズ済み)でスキップ判定を行い、スキップならここで成功終了する→(本番cron、または再実行で継続する場合)Claude Code CLIのインストール→配信日を使ってブランチ作成→`collect-and-select.ts`を配信日を引数に渡して実行(内部でTask 1の`shouldAlertOperator`を呼び、判定結果を`GITHUB_OUTPUT`の`alert`に書き出す。利用上限への到達を検知した場合はここより前にCLIが非ゼロ終了しジョブはここで失敗し、次の再実行cronに委ねる)→採用件数にかかわらず`generate-content.ts`(候補0件なら何もしない。利用上限への到達を検知した場合はここで非ゼロ終了し後続の`write-article.ts`には進まず、次の再実行cronに委ねる)→`write-article.ts`→コミット・push・PR作成・`gh pr merge --auto --squash`→`alert=='true'`ならここでジョブを非ゼロ終了(公開後の失敗表示)
  - `record-ci-failure`ジョブ: `future-digest/articles/**`ブランチのPRでCIが失敗したとき、失敗したジョブ・ステップ名をPRにコメントする

- Task 6: Actions Secretsの準備(仕様: design.md「実行環境の前提」)(TDD対象外。手動の設定作業)
  - fine-grained PAT(このリポジトリのみ、Contents・Pull requestsのwrite)を発行し`FUTURE_DIGEST_GH_PAT`として保存する
  - 既存の`CLAUDE_CODE_OAUTH_TOKEN`がそのまま使えることを確認する
  - `workflow_dispatch`で編ごとに1回ずつ実行し、PR作成→CI→自動マージまで通ることを確認する(動作確認用途。復旧用途で使う場合は`scheduled_publish_date`も指定する)

## 週1回配信を週2回(2編)に分割する追加タスク

Task 2・4・5を編(`edition`)対応に拡張し、2編目(くらし・社会編、日曜)のcronを追加する。〔提案〕

<details><summary>詳細を開く</summary>

- Task 7: 記事データの組み立て・配信日算出・冪等チェックの編対応(仕様: requirements.md#配信スケジュール-1〜3、design.md「配信日を求める処理」「利用上限への到達時に再実行する処理」手順1)
  - 🔴 Task 2の`assembleArticle`のテストに、引数`edition`を追加し`id`が`<date>-<edition>`になること・`edition`が記事データに入ることを確認するケースを足す
  - 🟢 `app/future-digest/lib/assembleArticle.ts`の`assembleArticle(date, edition, issueNumber, ...)`を変更する([article-detail/tasks.md](../article-detail/tasks.md)のparseArticleが`edition`必須になる前提で呼び出しを揃える)
  - 🔴 Task 4の`getScheduledPublishDate`のテストを、第2引数`edition`を渡す形に書き直し、`science-tech`なら木曜、`life-society`なら日曜を基準にすることを確認するケースを追加する。日曜09:43 JST相当のUTC日時を渡すとその日が返る、日曜21:43・月曜09:43・月曜21:43(JSTの3本の再実行cronをUTC換算)を渡すと同じ週の日曜が返る境界値も確認する
  - 🟢 `app/future-digest/lib/scheduledPublishDate.ts`の`getScheduledPublishDate(nowUtc, edition)`を実装する(編ごとに対象曜日を切り替える)
  - 🔴 `validateScheduledPublishDate`のテストに、第2引数`edition`を渡す形を追加し、`life-society`では日曜以外は不正になることを確認するケースを足す
  - 🟢 同じファイルの`validateScheduledPublishDate(value, edition)`を実装する
  - 🔴 `shouldSkipRetry`のテストに、第3引数`edition`を渡す形を追加し、同じ`date`でも`edition`が違う記事は既存とみなさないことを確認するケースを足す
  - 🟢 `app/future-digest/lib/shouldSkipRetry.ts`の`shouldSkipRetry(articles, scheduledPublishDate, edition)`を実装する

- Task 8: ワークフローへの2編目(くらし・社会編)cron追加と編判定(仕様: design.md「実行環境の前提」「1回分の記事を生成する処理」「利用上限への到達時に再実行する処理」「セキュリティ」)(TDD対象外。GitHub Actionsの定義のため。編ごとの関数の分岐はTask 7でテスト済み)
  - `.github/workflows/future-digest-weekly.yml`の`schedule`に、くらし・社会編の本番cron`43 0 * * 0`と再実行cron`43 12 * * 0`・`43 0 * * 1`・`43 12 * * 1`の3本を追加する(design.md「実行環境の前提」)
  - `workflow_dispatch`の入力に、`edition`(必須。`science-tech`/`life-society`のchoice。trend-digestのworkflow_dispatchと同じ形)を追加する
  - 編の判定ステップを追加する: `workflow_dispatch`では入力`edition`をそのまま使い、`schedule`では`github.event.schedule`がサイエンス・テクノロジー編の4本のcron式のいずれかに一致すれば`science-tech`、それ以外なら`life-society`とする(trend-digest-weekly.ymlの編成判定ステップと同じ書き方)
  - ブランチ作成・`collect-and-select.ts`・`write-article.ts`の呼び出しに`edition`を渡すよう更新し、ブランチ名・記事ファイル名を`<date>-<edition>`の形にする。`shouldSkipRetry`・`getScheduledPublishDate`の呼び出しにも`edition`を渡す
  - PRのタイトル・本文に編のラベルを含める

</details>
