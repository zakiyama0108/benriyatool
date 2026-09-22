# タスク分解: トレンド継続履歴と中長期ステータス判定

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

このspecの実装は[content-selection](../content-selection/tasks.md)の改訂と同時に動くため、Task 1〜7(履歴の型・集約・判定・掲載実績)を先に仕上げてから、content-selection側の絞り込みの差し替えに進む。

- Task 1: 履歴の型定義と閾値データの追加(仕様: design.md「履歴データの形式」)
  - `app/trend-digest/lib/historyTypes.ts`に`TrendStatus`/`Observation`/`ObservationLog`/`CandidateHistory`/`StatusJudgement`/`HistoryCriteria`を定義する(TDD対象外。型定義のみのため)。`Edition`/`Genre`は`app/trend-digest/lib/types.ts`からimportして再利用し、本specでは再定義しない
  - `app/trend-digest/lib/watchlistTypes.ts`の`Criteria`に`history: HistoryCriteria`を追加する
  - `content/trend-digest/criteria.json`にdesign.mdの`history`初期値を追加する

- Task 2: 観測ログのスキーマ検証・パース(仕様: design.md「バリデーション」)
  - 🔴 `date`が`YYYY-MM-DD`でない・`edition`が定義外・`observations`が配列でない・`genre`が定義外・`title`が空文字・`strength`が数値でない・`method`が定義外・ファイル名と中身の`date`/`edition`が食い違う・同じファイル内に同じ正規化タイトルの観測が2件ある、の各ケースで例外になること、正しいログはそのままパースされること、`observations`が0件のログは正常に読めることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/historySchema.ts`に`parseObservationLog(raw, filename)`を実装する

- Task 3: 観測ログの書き出し(仕様: design.md「その回の観測を履歴に記録する処理」)
  - 🔴 一時ディレクトリを使い、候補一覧から`<date>-<edition>.json`が作られること、同じ回に同じ正規化タイトルの候補が複数あるとき`strength`が最大の1件だけが残ること、候補0件でも`observations`が空のファイルが作られること、同名ファイルが既にある場合は上書きせず例外になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/writeObservationLog.ts`に`writeObservationLog(historyDir, date, edition, candidates)`を実装する

- Task 4: 履歴の集約(仕様: design.md「履歴を候補ごとの系列に集約する処理」)
  - 🔴 一時ディレクトリに複数回分の観測ログを置き、正規化タイトルごとに1本の系列へまとまること、**ジャンルが違っても同じ正規化タイトルなら同じ系列にまとまること**、初回検知日・直近検知日・検知回数・強度の推移(日付昇順)が正しく求まること、ジャンル・原題・主な流行地域は直近の観測の値が採られること、発祥地域は最も古い観測で判定できた値が優先されること、観測ログが1件もないときは空の結果になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/aggregateHistory.ts`に`aggregateHistory(logs): CandidateHistory[]`を実装する。正規化は`selection.ts`の`normalizeTitle`を再利用し、正規化ルールを二重に持たない

- Task 5: 継続日数の算出とステータス判定(仕様: requirements.md#ステータス判定基準-1〜7、design.md「継続日数と強度の推移からステータスを判定する処理」)
  - 🔴 判定順序を網羅するテストを書く: 継続日数0→NEW / 途絶え+継続13日以内→SHORT_TERM / 途絶え+継続14日以上→DECLINING / 直近強度がピークの`decliningRatio`以下→DECLINING(他の条件より優先されること) / 直近がピーク自身なら減少と判定しないこと / 観測が`minSamplesForTrend`未満なら増減を判定しないこと / 継続90日以上+強度が平均の±`stableBandRatio`内→STABLE / 継続90日以上でも強度がばらつけばESTABLISHED / 継続30日以上→ESTABLISHED / 継続14〜29日+後半平均÷前半平均が`risingRatio`以上→GROWING / 継続14〜29日で増加傾向がなければEMERGING / 継続1〜13日で継続中→EMERGING
  - 🔴 強度の尺度が異なる系列(固定リスト由来の80〜99と、WebSearch由来の2〜5)で同じ比率の増減なら同じ判定になることを確認するテストを書く(絶対値ではなく比で判定していることの確認)
  - 🟢 `app/trend-digest/lib/judgeStatus.ts`に`judgeStatus(history, criteria, latestRunDate): StatusJudgement`を実装する

- Task 6: 掲載可否の判定(仕様: requirements.md#ステータス判定基準-8、design.md「継続日数と強度の推移からステータスを判定する処理」手順3)
  - 🔴 EMERGING/GROWING/ESTABLISHED/STABLEは`isPublishable`が真、NEW/SHORT_TERM/DECLININGは偽になることを確認するテストを書く
  - 🟢 `judgeStatus.ts`に掲載可否の判定を実装する

- Task 7: 掲載実績(報告回数・前回掲載時のステータス)の算出(仕様: requirements.md#掲載実績の追跡-1〜2、design.md「掲載実績(報告回数・前回掲載時のステータス)を求める処理」)
  - 🔴 一時ディレクトリに過去記事JSONを置き、同じ正規化タイトルの掲載回数が数えられること、今回の報告回数が「過去の掲載回数+1」になること、前回掲載時のステータスが最も新しい掲載トピックのものになること、`trend`を持たない過去記事しかない場合は「前回掲載時のステータスは不明」になること、一度も掲載されていない候補は掲載回数0・報告回数1になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/publishRecords.ts`に`collectPublishRecords(articlesDir)`を実装する(既存の`reviewRecords.ts`と同じく、ディレクトリを引数で受け取る形にする)

- Task 8: 地域情報の収集(固定リストジャンル側)(仕様: requirements.md#地域情報-1〜3、[content-selection/design.md](../content-selection/design.md)「固定リストジャンルの候補を収集・判定する処理」手順6)
  - 🔴 情報源に`region`を持たせたウォッチリストをモックし、日本の情報源だけで検出された候補は日本での強度に件数が入り海外での強度が0になること、両方の区分で検出された候補は両方に件数が入ること、そのジャンルに一方の区分の情報源が登録されていない場合はその区分が「不明」(null)になること、発祥地域・主な流行地域は「不明」のままになることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/fetchFixedListCandidates.ts`に地域情報の集計を追加する

- Task 9: 地域情報の収集(WebSearchジャンル側)(仕様: requirements.md#地域情報-1〜3、[content-selection/design.md](../content-selection/design.md)「WebSearchジャンルの候補を収集・判定する処理」手順5)(TDD対象外。Claude Code CLIのヘッドレス起動を伴うため)
  - `scripts/trend-digest/collect-websearch-candidates.ts`のプロンプトに、日本のメディア数・海外のメディア数・発祥地域・主な流行地域を返す指示と、判定できない項目は推測で埋めず「不明」で返す指示を追加する
  - 応答JSONの形式にこれらの項目を追加し、応答形式の分類ロジック(パース部)のみをテスト対象にする

- Task 10: 週次実行への組み込み(仕様: design.md「処理フロー」全体、[weekly-publish/design.md](../weekly-publish/design.md)「1回分の記事を生成する処理」)(TDD対象外。CLIの配線のため)
  - `scripts/trend-digest/collect-and-select.ts`に、候補収集の直後に観測ログを書き出す処理と、履歴の集約・ステータス判定・掲載実績の算出を呼び出す処理を追加する
  - 観測ログの書き出しに失敗した場合は非ゼロ終了し、記事生成に進まないようにする(design.md「エラーハンドリング」)
  - 記事を作らない回でも観測ログだけをコミット・PR作成するよう、週次実行のワークフローを更新する([weekly-publish/design.md](../weekly-publish/design.md)「記事生成をスキップする処理」)

- Task 11: ログ出力(仕様: design.md「ログ」)
  - 🔴 観測件数・ステータスごとの件数・掲載可能でなかったために除外した件数・地域が不明だった件数が標準エラー出力に出ること、掲載可能な候補が0件の編は`WARN`と分かる形で出ることを確認するテストを書く
  - 🟢 ログ出力を実装する

- Task 12: 運用開始直後の挙動の確認(仕様: design.md「エラーハンドリング」最終項、[content-selection/requirements.md#中長期トレンドの絞り込み-3](../content-selection/requirements.md))
  - 🔴 履歴ディレクトリが存在しない場合・観測ログが0件の場合に例外にならず、すべての候補が継続日数0のNEWとして扱われることを確認するテストを書く
  - 🟢 該当の分岐を実装する
