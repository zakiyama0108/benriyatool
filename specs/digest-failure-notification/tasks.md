# タスク分解: digest-failure-notification

> 全9件(Task 1〜Task 9)
> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## 判定ロジック(app/lib/digestFailureNotification/shouldNotify.ts)

### Task 1: 即時通知グループの失敗を通知対象と判定する(仕様: requirements.md#通知タイミング-1)

自動再実行の仕組みを持たない3ワークフローは、失敗したら直ちに通知対象と判定する。

<details><summary>詳細を開く</summary>

- 🔴 `shouldNotify({ workflowName: "AI駆動開発ダイジェスト 日次記事公開", conclusion: "failure", event: "schedule", createdAt: <任意のISO文字列> })`が`{ notify: true, reason: "immediate" }`を返すことを検証するテストを書く(「重要ニュース週刊ダイジェスト 週次記事公開」「トレンドダイジェスト 週次記事公開」の2ワークフロー分も同様に検証する)
- 🟢 `app/lib/digestFailureNotification/shouldNotify.ts`に、即時通知グループのワークフロー名一覧(定数)との一致判定を実装する
- 🔵 ワークフロー名一覧・判定本体を関数として整理する

</details>

### Task 2: 再実行グループのworkflow_dispatch失敗を通知対象と判定する(仕様: requirements.md#通知タイミング-3)

研究発見・週刊未来予測がworkflow_dispatch(手動実行)で失敗した場合は、再実行の仕組みの対象外として直ちに通知対象と判定する。

<details><summary>詳細を開く</summary>

- 🔴 `shouldNotify({ workflowName: "研究発見 週次記事公開", conclusion: "failure", event: "workflow_dispatch", createdAt: <任意のISO文字列> })`が`{ notify: true, reason: "manual" }`を返すことを検証するテストを書く(「週刊未来予測 週次記事公開」分も同様に検証する)
- 🟢 再実行グループのワークフロー名一覧(定数)に一致し、かつ`event === "workflow_dispatch"`の場合に`manual`判定を返す分岐を実装する
- 🔵 即時通知グループと再実行グループの定数を整理する

</details>

### Task 3: 再実行グループで最後の再実行(36時間後)の失敗を通知対象と判定する(仕様: requirements.md#通知タイミング-2)

schedule起動の失敗が、各ワークフロー・各編の「本番の36時間後」の時刻スロットと許容誤差±90分の範囲で一致する場合に通知対象と判定する。

<details><summary>詳細を開く</summary>

- 🔴 研究発見(body-life: 火曜04:43 UTC、science-society: 日曜08:43 UTC)・週刊未来予測(science-tech: 金曜04:43 UTC、life-society: 月曜06:43 UTC)の4スロットそれぞれについて、`createdAt`がスロットの時刻ちょうどの場合・許容誤差の範囲内(例: スロット+80分)の場合に`{ notify: true, reason: "final-retry" }`を返すテストを書く
- 🟢 `app/lib/digestFailureNotification/lastRetrySlots.ts`(新規)に4スロットの定義(ワークフロー名・UTC曜日・UTC時刻)を持たせ、`shouldNotify`から`createdAt`との差分(分)が90分以内かを判定するロジックを実装する
- 🔵 時刻差分の計算をヘルパー関数に切り出す

</details>

### Task 4: 再実行グループで本番・12時間後・24時間後の失敗は通知しないと判定する(仕様: requirements.md#通知タイミング-2)

最後の再実行(36時間後)以外のタイミングの失敗では通知しない。

<details><summary>詳細を開く</summary>

- 🔴 研究発見・週刊未来予測それぞれについて、本番(例: 日曜16:43 UTC)・12時間後・24時間後に相当する`createdAt`で`shouldNotify`を呼び、`{ notify: false, reason: "retry-in-progress" }`が返ることを検証するテストを書く(許容誤差±90分の境界外であることも1ケース確認する)
- 🟢 Task 3の時刻照合が一致しない場合に`retry-in-progress`を返すようにする
- 🔵 -

</details>

### Task 5: 失敗以外のconclusion・未知のワークフロー名では通知しないと判定する(防御的ケース)

対象外のconclusion、想定外のワークフロー名(将来の名称変更等)、および`record-ci-failure`ジョブ起因の`workflow_run`イベントでは何もしない。

<details><summary>詳細を開く</summary>

- 🔴 `conclusion: "success"`・`conclusion: "cancelled"`で`{ notify: false, reason: "not-failure" }`が返ること、未知の`workflowName`で`{ notify: false, reason: "unknown-workflow" }`が返ることを検証するテストを書く
- 🔴 即時通知グループ(例: 「AI駆動開発ダイジェスト 日次記事公開」)・再実行グループ(例: 「研究発見 週次記事公開」)それぞれについて、`conclusion: "failure"`かつ`event: "workflow_run"`(各対象ワークフロー自身の`record-ci-failure`ジョブの失敗に相当)で`shouldNotify`を呼び、`{ notify: false, reason: "ci-related" }`が返ることを検証するテストを書く
- 🟢 `shouldNotify`の先頭で`conclusion !== "failure"`を弾き、ワークフロー名がどちらのグループにも一致しない場合のフォールバックを実装する
- 🔵 分岐全体を見直し、早期returnの順序を整理する

</details>

## 通知メッセージ組み立て(app/lib/digestFailureNotification/buildNotificationMessage.ts)

### Task 6: 通知メッセージ本文を組み立てる(仕様: requirements.md#失敗検知・通知-4)

アプリ名・失敗したワークフロー名・失敗日時(JST)・ログURLを含むテキストメッセージを組み立てる。

<details><summary>詳細を開く</summary>

- 🔴 `buildNotificationMessage({ workflowName: "AI駆動開発ダイジェスト 日次記事公開", updatedAt: <ISO文字列>, htmlUrl: "https://github.com/.../runs/123" })`が、アプリ名(例: "ai-dev-digest")・ワークフロー名・JSTに変換した失敗日時・ログURLを含む文字列を返すことを検証するテストを書く。5ワークフロー全てのアプリ名導出も検証する
- 🟢 `app/lib/digestFailureNotification/workflowAppNames.ts`(新規)にワークフロー名→アプリ名の対応表を持たせ、`buildNotificationMessage`でメッセージを組み立てる
- 🔵 日時のJST変換処理を整理する

</details>

## 通知CLI(scripts/digest-failure-notification/notify.ts)

### Task 7: workflow_runイベント情報から判定・送信までを行うCLIを実装する(仕様: requirements.md#失敗検知・通知-3)

環境変数で渡されたイベント情報を元に`shouldNotify`→(通知対象の場合)`buildNotificationMessage`→LINE push送信までを行う。

<details><summary>詳細を開く</summary>

- 🔴 `notify.ts`が公開する`run(env)`相当の関数に対し、(a) 通知対象でない場合はLINE APIを呼ばずに終了すること、(b) 通知対象の場合は組み立てたメッセージでLINE push APIを呼ぶことを、`fetch`をモックして検証するテストを書く
- 🟢 `scripts/digest-failure-notification/notify.ts`に、環境変数(`WORKFLOW_NAME`・`CONCLUSION`・`EVENT`・`CREATED_AT`・`UPDATED_AT`・`HTML_URL`)の読み取り→`shouldNotify`→`buildNotificationMessage`→`POST https://api.line.me/v2/bot/message/push`(`Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`、宛先`LINE_ADMIN_USER_ID`)の呼び出しを実装する
- 🔵 CLIのエントリポイントとテスト可能な`run`関数を分離する

</details>

### Task 8: LINE API呼び出し失敗時にリトライせず異常終了する(仕様: requirements.md#失敗検知・通知-3)

LINE push APIがエラーを返した場合、リトライせずHTTPステータス等をログに記録してCLIを異常終了させる。

<details><summary>詳細を開く</summary>

- 🔴 LINE push APIのレスポンスが200以外になるよう`fetch`をモックし、`run(env)`が例外を投げる(またはCLIが非ゼロ終了する)こと、HTTPステータスを`console.error`に記録することを検証するテストを書く
- 🟢 `notify.ts`に、レスポンスが200以外の場合にHTTPステータス・レスポンス概要を記録してから異常終了する分岐を実装する(リクエストヘッダーはログに出力しない)
- 🔵 -

</details>

## ワークフロー定義(.github/workflows/digest-failure-notification.yml)

### Task 9: 5ワークフローを監視し失敗時にnotify.tsを呼ぶワークフローを作成する(仕様: requirements.md#失敗検知・通知-1〜2)

`workflow_run`トリガーで対象5ワークフローを監視し、イベント情報を環境変数でnotify.tsへ渡す。

<details><summary>詳細を開く</summary>

- 🔴 (ワークフローYAML自体はvitestで検証しない。Task 1〜8のテストが揃っていることを前提に、`actions/checkout`→`setup-node`→`npm ci`→`npx tsx scripts/digest-failure-notification/notify.ts`を実行する構成で作成する)
- 🟢 `.github/workflows/digest-failure-notification.yml`を新規作成する。`on.workflow_run.workflows`に5ワークフロー名(`AI駆動開発ダイジェスト 日次記事公開`・`重要ニュース週刊ダイジェスト 週次記事公開`・`トレンドダイジェスト 週次記事公開`・`研究発見 週次記事公開`・`週刊未来予測 週次記事公開`)、`types: [completed]`を指定する。`github.event.workflow_run`の各フィールド(`name`・`conclusion`・`event`・`created_at`・`updated_at`・`html_url`)を環境変数経由で`notify.ts`に渡す(`run:`に直接埋め込まずシェルインジェクションを避ける)。Secrets(`LINE_CHANNEL_ACCESS_TOKEN`・`LINE_ADMIN_USER_ID`)を渡す
- 🔵 ステップ名・コメントを整理する

</details>
