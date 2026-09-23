# タスク分解: トレンド継続履歴と中長期ステータス判定

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

このspecの実装は[content-selection](../content-selection/tasks.md)の改訂と同時に動くため、Task 1〜7(履歴の型・集約・判定・掲載実績)を先に仕上げてから、content-selection側の絞り込みの差し替えに進む。

- Task 1: 履歴の型定義と閾値データの追加(仕様: design.md「履歴データの形式」)
  - `app/trend-digest/lib/historyTypes.ts`に`TrendStatus`/`Observation`/`ObservationLog`/`CandidateHistory`/`StatusJudgement`/`HistoryCriteria`を定義する(TDD対象外。型定義のみのため)。`Edition`/`Genre`は`app/trend-digest/lib/types.ts`からimportして再利用し、本specでは再定義しない
  - `historyTypes.ts`に`LONG_TERM_TREND_STATUSES`(GROWING/ESTABLISHED/STABLE)も定義する(性質をテストで固定するのはTask 6)
  - `app/trend-digest/lib/watchlistTypes.ts`の`Criteria`に`history: HistoryCriteria`を追加する(型は`historyTypes.ts`からimportする。型定義の置き場所は本specが持つ)
  - `content/trend-digest/criteria.json`にdesign.mdの`history`初期値を追加する

- Task 2: 観測ログのスキーマ検証・パース(仕様: design.md「バリデーション」)
  - 🔴 `date`が`YYYY-MM-DD`でない・`edition`が定義外・`observations`が配列でない・`genre`が定義外・`title`が空文字・`strength`が数値でない・`rank`が0以下や小数・`method`が定義外・ファイル名と中身の`date`/`edition`が食い違う・同じファイル内に同じ正規化タイトルの観測が2件ある、の各ケースで例外になること、正しいログはそのままパースされること、`observations`が0件のログは正常に読めることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/historySchema.ts`に`parseObservationLog(raw, filename)`を実装する

- Task 3: 観測ログの書き出し(仕様: design.md「その回の観測を履歴に記録する処理」)
  - 🔴 一時ディレクトリを使い、候補一覧から`<date>-<edition>.json`が作られること、同じ回に同じ正規化タイトルの候補が複数あるとき**選定方式ごとに**`strength`が最大の1件だけが残ること(固定リストとWebSearchの双方で取れた候補は方式ごとに1件ずつ、計2件が残ること)、候補0件でも`observations`が空のファイルが作られること、同名ファイルが既にある場合は上書きせず例外になることを確認するテストを書く
  - 🔴 固定リストジャンルの候補は順位(`rank`)が観測ログに記録されること、新着記事一覧型の候補とWebSearchジャンルの候補は`rank`がnullで記録されることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/writeObservationLog.ts`に`writeObservationLog(historyDir, date, edition, candidates)`を実装する

- Task 4: 履歴の集約(仕様: design.md「履歴を候補ごとの系列に集約する処理」)
  - 🔴 一時ディレクトリに複数回分の観測ログを置き、正規化タイトルごとに1本の系列へまとまること、**ジャンルが違っても同じ正規化タイトルなら同じ系列にまとまること**、初回検知日・直近検知日・検知回数・強度の推移(日付昇順、選定方式付き)が正しく求まること、同じ回に両方式で観測された候補の検知回数が1回と数えられること、**`isActive`が「同じ編の直近の実行で検知されたか」で決まること**(エンタメ編の候補が、より新しいカルチャー編の実行によって『途絶えた』と判定されないこと)、両方の編で観測されている候補はいずれかの編の直近の実行で検知されていれば`isActive`が真になること、`observedEditions`に観測された編がすべて入ること、`isFirstRun`が「どの編でも過去に観測がなく今回が初検知」のときだけ真になること、ジャンル・原題・主な流行地域は直近の観測の値が採られること、発祥地域は最も古い観測で判定できた値が優先されること、観測ログが1件もないときは空の結果になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/aggregateHistory.ts`に`aggregateHistory(logs): CandidateHistory[]`を実装する。正規化は`selection.ts`の`normalizeTitle`を再利用し、正規化ルールを二重に持たない

- Task 5: 継続日数の算出とステータス判定(仕様: requirements.md#ステータス判定基準-1〜7、design.md「継続日数と強度の推移からステータスを判定する処理」)
  - 🔴 判定順序を網羅するテストを書く(**途絶えの判定が継続日数より先に当たること**を含む): 途絶え+継続13日以内→SHORT_TERM / **1回だけ検知されて途絶えた候補(継続日数0)がNEWではなくSHORT_TERMになること**(`isActive`が偽) / 途絶え+継続14日以上→DECLINING / `isFirstRun`が真→NEW / 片方の編で過去に観測がある候補は`isFirstRun`が偽でNEWにならないこと / 直近強度がピークの`decliningRatio`以下→DECLINING(他の条件より優先されること) / 直近がピーク自身なら減少と判定しないこと / 観測が`minSamplesForTrend`未満なら増減を判定しないこと / 継続90日以上+強度が平均の±`stableBandRatio`内→STABLE / 継続90日以上でも強度がばらつけばESTABLISHED / 継続30日以上→ESTABLISHED / 継続14〜29日+後半平均÷前半平均が`risingRatio`以上→GROWING / 継続14〜29日で増加傾向がなければEMERGING / 継続1〜13日で継続中→EMERGING
  - 🔴 **選定方式ごとに増減の測り方が変わることを確認するテストを書く**(requirements.md#ステータス判定基準-9): 固定リストの推移は**順位の差**で判定されること(前半平均順位−後半平均順位が`risingRankImprovement`以上でGROWING / 直近順位−最良順位が`decliningRankDrop`以上でDECLINING)、WebSearchの推移は**言及元数の比**で判定されること(`risingRatio`/`decliningRatio`)
  - 🔴 **固定リストの現実的な強度帯(90〜99)でGROWINGに到達できることを確認するテストを書く**: 10位→7位のように順位が`risingRankImprovement`以上改善した系列がGROWINGになること(比で判定していたら99÷90=1.10で`risingRatio`に届かず到達不能だった経路の回帰テスト)
  - 🔴 固定リストの推移に`rank`がnullの観測(新着記事一覧型)が混ざる場合、その観測が増減の判定から除外されること、除外の結果`minSamplesForTrend`未満になったら増減を判定しないことを確認するテストを書く
  - 🔴 **選定方式が混在する系列のテストを書く**: 固定リストで99・WebSearchで3を観測した候補が、比0.03でDECLININGと判定されないこと(方式をまたいで強度を比べないこと) / 増減の判定に観測件数が最も多い方式の推移が使われること / 件数が同じ場合は直近の観測が属する方式が使われること / **`rank`がnullの観測を除外した後の件数**で方式が選ばれること(除外前の件数で選ぶと判定できる方式があるのに諦めてしまうケース) / 同じ回に両方式で観測されていて直近の方式が1つに決まらない場合は固定リストの推移が使われること
  - 🔴 **横ばい(STABLE)も方式ごとに測ることを確認するテストを書く**(requirements.md#ステータス判定基準-9): 固定リストの推移は平均順位の上下`stableRankBand`以内かで判定されること、**順位が1位と10位を往復している継続90日以上の候補がSTABLEにならないこと**(強度の比で測っていたら90〜99が平均95の±20%=76〜114に全部収まり無条件にSTABLEになっていた経路の回帰テスト)、WebSearchの推移は従来どおり`stableBandRatio`で判定されること
  - 🔴 境界値・特殊ケースのテストを書く(design.md「境界値・特殊ケースの扱い」の表): ピーク強度が0なら減少と判定しないこと / 前半の平均が0なら増加傾向と判定しないこと / 直近`minSamplesForTrend`回分がすべて0なら横ばいとみなすこと・1件でも0でなければ横ばいとみなさないこと / 観測回数が奇数のとき前半が`floor(件数÷2)`件・後半が残りに分かれること
  - 🟢 `app/trend-digest/lib/judgeStatus.ts`に`judgeStatus(history, criteria): StatusJudgement`を実装する(途絶え・初検知の判定材料は`CandidateHistory`の`isActive`・`isFirstRun`が持つため、実行日は引数に取らない)

- Task 6: 「中長期トレンドとみなせるステータス」の公開(仕様: requirements.md#ステータス判定基準-8、design.md「継続日数と強度の推移からステータスを判定する処理」手順3)
  - 🔴 `LONG_TERM_TREND_STATUSES`がGROWING/ESTABLISHED/STABLEの3つだけを含み、NEW/SHORT_TERM/EMERGING/DECLININGを含まないことを確認するテストを書く
  - 🔴 `judgeStatus`の戻り値が掲載可否そのもの(`isPublishable`)を持たないこと、ステータス・継続日数・初回検知日・検知回数を返すことを確認するテストを書く(掲載可否の判断はcontent-selectionの責務のため)
  - 🟢 content-selection側の絞り込みが`LONG_TERM_TREND_STATUSES`を参照するようにする(定義自体はTask 1で作成済み)

- Task 7: 掲載実績(報告回数・前回掲載時のステータス)の算出(仕様: requirements.md#掲載実績の追跡-1〜2、design.md「掲載実績(報告回数・前回掲載時のステータス)を求める処理」)
  - 🔴 一時ディレクトリに過去記事JSONを置き、同じ正規化タイトルの掲載回数が数えられること、今回の報告回数が「過去の掲載回数+1」になること、前回掲載時のステータスが最も新しい掲載トピックのものになること、`trend`を持たない過去記事しかない場合は「前回掲載時のステータスは不明」になること、一度も掲載されていない候補は掲載回数0・報告回数1になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/publishRecords.ts`に`collectPublishRecords(articlesDir)`を実装する(既存の`reviewRecords.ts`と同じく、ディレクトリを引数で受け取る形にする)

- Task 8a: 順位(`rank`)の採取と、採用基準の判定前の全項目の保持(仕様: [content-selection/design.md](../content-selection/design.md)「固定リストジャンルの候補を収集・判定する処理」手順2・手順7、requirements.md#機能要件-1〜2)
  - 🔴 順位付きランキング型の情報源をモックし、候補に情報源の順位がそのまま`rank`として入ること、新着記事一覧型の情報源から抽出した候補は`rank`がnullになること、musicのような上昇幅加点があるジャンルでも`rank`が`100 - strength`ではなく実際の順位になることを確認するテストを書く
  - 🔴 **採用基準を満たさなかった項目も観測用に保持されること**を確認するテストを書く: `newEntryOrRisingRank`のジャンルで「新規でも順位上昇でもない」項目が、掲載候補には含まれないが観測ログへ渡す一覧には含まれること(上位に居続ける作品が履歴から消えないことの回帰テスト)
  - 🟢 `app/trend-digest/lib/fetchFixedListCandidates.ts`に`rank`の設定と、採用基準判定前の全項目を返す口を実装する

- Task 8: 地域情報の収集(固定リストジャンル側)(仕様: requirements.md#地域情報-1〜3、[content-selection/design.md](../content-selection/design.md)「固定リストジャンルの候補を収集・判定する処理」手順8)
  - 🔴 情報源に`region`を持たせたウォッチリストをモックし、日本の情報源だけで検出された候補は日本での強度に件数が入り海外での強度が0になること、両方の区分で検出された候補は両方に件数が入ること、そのジャンルに一方の区分の情報源が登録されていない場合はその区分が「不明」(null)になること、発祥地域・主な流行地域は「不明」のままになることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/fetchFixedListCandidates.ts`に地域情報の集計を追加する

- Task 9: 地域情報の収集(WebSearchジャンル側)(仕様: requirements.md#地域情報-1〜3、[content-selection/design.md](../content-selection/design.md)「WebSearchジャンルの候補を収集・判定する処理」手順5)(TDD対象外。Claude Code CLIのヘッドレス起動を伴うため)
  - `scripts/trend-digest/collect-websearch-candidates.ts`のプロンプトに、日本のメディア数・海外のメディア数・発祥地域・主な流行地域を返す指示と、判定できない項目は推測で埋めず「不明」で返す指示を追加する
  - 応答JSONの形式にこれらの項目を追加し、応答形式の分類ロジック(パース部)のみをテスト対象にする

- Task 10: 週次実行への組み込み(仕様: design.md「処理フロー」全体、[weekly-publish/design.md](../weekly-publish/design.md)「1回分の記事を生成する処理」)(TDD対象外。CLIの配線のため)
  - `scripts/trend-digest/collect-and-select.ts`に、候補収集の直後に観測ログを書き出す処理と、履歴の集約・ステータス判定・掲載実績の算出を呼び出す処理を追加する
  - 観測ログの書き出しに失敗した場合は非ゼロ終了し、記事生成に進まないようにする(design.md「エラーハンドリング」)
  - 記事を作らない回でも観測ログだけをコミット・PR作成するよう、週次実行のワークフローを更新する([weekly-publish/design.md](../weekly-publish/design.md)「記事生成をスキップする処理」)
  - **全候補の生成失敗・利用枠の枯渇で非ゼロ終了する場合も、その前に観測ログだけをコミット・push・PR作成する**([weekly-publish/design.md](../weekly-publish/design.md)「エラーハンドリング」)。観測ログを捨てて終了すると欠測週となり、以後の継続日数・報告回数が実態とずれるため

- Task 11: ログ出力(仕様: design.md「ログ」)
  - 🔴 観測件数・全候補のステータスごとの件数・地域が不明だった件数が標準エラー出力に出ることを確認するテストを書く(掲載可否にもとづく除外件数・再掲見送り件数・掲載可能0件の`WARN`はcontent-selection側のログのため、本タスクの対象外)
  - 🟢 ログ出力を実装する

- Task 12: 運用開始直後・欠測週の挙動の確認(仕様: design.md「エラーハンドリング」、[content-selection/requirements.md#中長期トレンドの絞り込み-3](../content-selection/requirements.md))
  - 🔴 履歴ディレクトリが存在しない場合・観測ログが0件の場合に例外にならず、すべての候補が継続日数0のNEWとして扱われることを確認するテストを書く
  - 🔴 **欠測週(ある週の観測ログが存在しない)のテストを書く**: 欠測週が検知回数にも強度の推移にも現れないこと、「同じ編の直近の実行」が欠測週ではなく実際にログが残っている最も新しい実行を指すこと、欠測があっても継続日数(日付の差)が変わらないこと、欠測によって継続中の候補がSHORT_TERM・DECLININGに落ちないこと
  - 🟢 該当の分岐を実装する

- Task 13: 改訂した既存specの`> ステータス: 仕様確認中`行の削除(仕様: [.claude/skills/pr/references/spec-pr.md](../../../.claude/skills/pr/references/spec-pr.md))(TDD対象外)
  - 本specの実装が完了し、改訂分に対応するテストが揃った時点で、`content-selection`・`article-detail`・`content-generation`・`weekly-publish`の各`requirements.md`3行目の`> ステータス: 仕様確認中(中長期トレンド対応は未実装)`を削除する
  - この行がある間、4specの`requirements.md`/`design.md`は`check:spec-coverage`の対象から丸ごと外れ、**既に実装・テスト済みのルールまで検証が止まる**。改訂の実装が済んだら必ず外し、除外が残り続けないようにする
  - あわせて`scripts/spec-coverage-skip.json`を見直す。`> ステータス: 仕様確認中`行を外すとこれら4specと本specの項目がカバレッジ検査の対象に入るため、次を確認する:
    - 今回の改訂で採番がずれた項目(weekly-publishの`公開フロー [6]`・`[7]`など)のキーが現行の採番と一致しているか
    - TDD対象外の項目(Task 9・Task 10のCLI配線、weekly-publish 実行[5]の観測ログ追加など)に理由付きのskipエントリが登録されているか
    - 実在しない項目を指すエントリ(孤立エントリ)が残っていないか
