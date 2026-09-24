# タスク分解: トレンド継続履歴と継続度・注目度の判定

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

このspecの実装は[content-selection](../content-selection/tasks.md)の改訂と同時に動くため、Task 1〜8(履歴の型・集約・ラベル判定・掲載実績)を先に仕上げてから、content-selection側の選定処理の差し替えに進む。

- Task 1: 履歴の型定義と判定値の追加(仕様: design.md「履歴データの形式」)
  - `app/trend-digest/lib/historyTypes.ts`に`DurationLabel`/`HeatLabel`/`Observation`/`ObservationLog`/`CandidateHistory`/`HistoryJudgement`/`HistoryCriteria`を定義する(TDD対象外。型定義のみのため)。`Edition`/`Genre`は`app/trend-digest/lib/types.ts`からimportして再利用し、本specでは再定義しない
  - `historyTypes.ts`に`DURATION_LABEL_ORDER`・`HEAT_LABEL_ORDER`も定義する(並び順をテストで固定するのはTask 6)
  - `app/trend-digest/lib/watchlistTypes.ts`の`Criteria`に`history: HistoryCriteria`を追加する(型は`historyTypes.ts`からimportする。値の意味の置き場所は本specが持つ)
  - `content/trend-digest/criteria.json`にdesign.mdの`history`初期値を追加する(`emergingMinDays`・`talkedMinDays`・`highlyTalkedMinDays`・`maxObservationsPerSource`・`heatMinObservationRuns`・`heatRankHigh`・`heatRankNormal`・`heatSourcesHigh`・`heatSourcesNormal`)

- Task 2: 観測ログのスキーマ検証・パース(仕様: design.md「バリデーション」)
  - 🔴 `date`が`YYYY-MM-DD`でない・`edition`が定義外・`observations`が配列でない・`genre`が定義外・`title`が空文字・`strength`が数値でない・`rank`が0以下や小数・`method`が定義外・ファイル名と中身の`date`/`edition`が食い違う・同じファイル内に同じ正規化タイトル**かつ同じ選定方式**の観測が2件ある・`rank`が`maxObservationsPerSource`を超える・`title`に制御文字が含まれる、の各ケースで例外になること、**正規化タイトルが同じでも選定方式が違う観測2件は例外にならないこと**(記録処理が方式ごとに1件ずつ残す仕様と整合すること)、正しいログはそのままパースされること、`observations`が0件のログは正常に読めることを確認するテストを書く
  - 🔴 地域情報の検証のテストを書く: `originRegion`が50文字超・空文字・制御文字入りなら例外になること、nullは許容されること、`currentRegions`の要素が50文字超・空文字・制御文字入りなら例外になること、要素が11件以上なら例外になること、空配列は許容されること
  - 🟢 `app/trend-digest/lib/historySchema.ts`に`parseObservationLog(raw, filename)`を実装する

- Task 3: 観測ログの書き出し(仕様: design.md「その回の観測を履歴に記録する処理」)
  - 🔴 一時ディレクトリを使い、観測項目一覧から`<date>-<edition>.json`が作られること、同じ回に同じ正規化タイトルの項目が複数あるとき**選定方式ごとに**1件だけが残ること(固定リストとWebSearchの双方で取れた項目は方式ごとに1件ずつ、計2件が残ること)、観測項目0件でも`observations`が空のファイルが作られること、同名ファイルが既にある場合は上書きせず例外になることを確認するテストを書く
  - 🔴 **同じ回・同じ方式で同名の項目が複数ある場合のdedupeの優先順位**を確認するテストを書く: 順位を持つ観測が順位を持たない観測より優先されること、順位を持つ観測が複数あれば最上位の1件が残ること、順位を持つ観測がなければ強さが最大の1件が残ること
  - 🔴 固定リストジャンルの項目は順位(`rank`)が観測ログに記録されること、WebSearchジャンルの項目は`rank`がnullで記録されることを確認するテストを書く
  - 🔴 **情報源ごとに上位`maxObservationsPerSource`件までに絞られること**を確認するテストを書く
  - 🔴 **履歴側の強さが`(maxObservationsPerSource + 1) - 順位`で設定されること**(1位が最大・上限位が1)、content-selectionの`100 - 順位`をそのまま使っていないこと、上限を超える順位の項目は記録対象外なので負値が発生しないことを確認するテストを書く
  - 🔴 採用基準を満たしたかどうか(`meetsCriteria`)が項目ごとに記録されることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/writeObservationLog.ts`に`writeObservationLog(historyDir, date, edition, observations)`を実装する

- Task 4: 履歴の集約(仕様: design.md「履歴を話題ごとの系列に集約する処理」)
  - 🔴 一時ディレクトリに複数回分の観測ログを置き、正規化タイトルごとに1本の系列へまとまること、**ジャンルが違っても同じ正規化タイトルなら同じ系列にまとまること**、初回検知日・直近検知日・検知回数が正しく求まること、同じ回に両方式で観測された話題の検知回数が1回と数えられること、`observedEditions`に観測された編がすべて入ること、直近の観測のジャンル・選定方式・強さ・順位が取り出されること、**同じ回に両方式で観測されている場合は固定リストジャンルの観測が直近として採られること**、原題・主な流行地域は直近の観測の値が採られること、発祥地域は最も古い観測で判定できた値が優先されること、観測ログが1件もないときは空の結果になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/aggregateHistory.ts`に`aggregateHistory(logs): CandidateHistory[]`を実装する。正規化は`selection.ts`の`normalizeTitle`を再利用し、正規化ルールを二重に持たない

- Task 5: 途切れずに続いている期間の算出(仕様: requirements.md#継続度ラベル-1、design.md「途切れずに続いている期間を求める処理」)
  - 🔴 **一度途切れたら数え直すことを確認するテストを書く**: 3ヶ月前に1回だけ観測され、間のすべての実行で観測されず、直近の実行で再び観測された話題の継続日数が0になること(初回検知日から直近検知日までの通算で測っていたら約90日になり「非常に話題」と誤判定された経路の回帰テスト)
  - 🔴 連続検知の境界のテストを書く: 直近から連続して検知されている実行をさかのぼり、検知がない実行に当たった直後で止まること、その止まる直前の最古の実行日が継続の開始日になること、継続日数が「直近検知日 − 継続の開始日」になること、その編の初回実行で初検知された話題は継続日数0になること
  - 🔴 **編ごとにさかのぼることを確認するテストを書く**: エンタメ編の話題の継続が、間に挟まるカルチャー編の実行(その話題を扱うジャンルがない)によって途切れたと判定されないこと
  - 🔴 両編で観測される話題のテストを書く: 編ごとに求めた継続の開始日のうち最も古いものが採られること、片方の編で観測が途切れてももう一方で続いていれば継続が切れないこと
  - 🔴 **欠測週のテストを書く**: ある週の観測ログ自体が存在しない場合、その週は実行の並びに現れず、継続のさかのぼりで飛ばされること、欠測によって継続中の話題の継続日数が0に戻らないこと
  - 🔴 今回の実行で検知されなかった話題も過去の継続期間をそのまま持ち、現在まで引き伸ばされないことを確認するテストを書く
  - 🟢 `aggregateHistory.ts`に継続の開始日・継続日数の算出を実装する

- Task 6: 継続度ラベルの判定(仕様: requirements.md#継続度ラベル-2〜7、design.md「継続度ラベルを判定する処理」)
  - 🔴 継続日数から4段階が決まることを確認するテストを書く: 0日・13日→流行前 / 14日・29日→注目され始め / 30日・89日→話題 / 90日・それ以上→非常に話題(`emergingMinDays`・`talkedMinDays`・`highlyTalkedMinDays`の境界値を両側から確認する)
  - 🔴 判定に使う日数が`criteria.json`の`history`から読まれ、コードに直書きされていないことを確認するテストを書く(閾値を変えたら判定が変わること)
  - 🔴 `DURATION_LABEL_ORDER`が流行前 < 注目され始め < 話題 < 非常に話題 の順であること、`HEAT_LABEL_ORDER`が低い < 普通 < 高い の順であることを確認するテストを書く(並べ替えの比較に使うため)
  - 🔴 判定結果が掲載可否そのもの(`isPublishable`相当)を持たないことを確認するテストを書く(掲載するかどうかの判断はcontent-selectionの責務のため)
  - 🟢 `app/trend-digest/lib/judgeDurationLabel.ts`に`judgeDurationLabel(continuationDays, criteria): DurationLabel`を実装する

- Task 7: 注目度ラベルの判定(仕様: requirements.md#注目度ラベル-8〜12、design.md「注目度ラベルを判定する処理」)
  - 🔴 **情報源での位置から決める場合のテストを書く**(そのジャンルの実行回数が`heatMinObservationRuns`未満): 固定リストジャンルで順位1位・3位→高い、4位・10位→普通、11位→低い / WebSearchジャンルで言及元5件→高い、3件・4件→普通、2件→低い(各境界を両側から確認する)
  - 🔴 **分布から決める場合のテストを書く**(実行回数が`heatMinObservationRuns`以上): そのジャンルの全観測の強さを昇順に並べた三分位で決まること、上側の境目以上→高い、下側の境目未満→低い、その間→普通になること、**上側と下側の境目が同じ値(分布に幅がない)なら普通になること**
  - 🔴 **切り替えの境界のテストを書く**: そのジャンルの実行回数が`heatMinObservationRuns`ちょうどなら分布で決まり、1回少なければ情報源での位置で決まること、`heatBasis`にどちらで決めたかが入ること
  - 🔴 **実行回数の数え方のテストを書く**: 「そのジャンルの観測が1件以上ある実行ログの数」で数えられること(そのジャンルの観測が0件のログ・他ジャンルしかないログが実行回数に数えられないこと)
  - 🔴 **分布が同じジャンルの中だけで作られることを確認するテストを書く**(requirements.md#注目度ラベル-11): 強さの尺度が違う他ジャンル・他方式の観測が分布に混ざらないこと(固定リストの強さ30とWebSearchの強さ3が同じ分布に入らないこと)
  - 🔴 判定結果が掲載可否を持たないことを確認するテストを書く
  - 🟢 `app/trend-digest/lib/judgeHeatLabel.ts`に`judgeHeatLabel(history, genreDistribution, criteria): { label: HeatLabel; basis: ... }`を実装する。ジャンルごとの強さの分布は呼び出し側が1度だけ組み立てて渡す(話題ごとに全ログを走査し直さないため。design.md「パフォーマンス」)

- Task 8: 掲載実績(掲載回数・報告回数・直近掲載時の継続度ラベル)の算出(仕様: requirements.md#掲載実績の追跡-13〜14、design.md「掲載実績(掲載回数・直近掲載時の継続度ラベル)を求める処理」)
  - 🔴 一時ディレクトリに過去記事JSONを置き、同じ正規化タイトルの掲載回数が数えられること、今回の報告回数が「過去の掲載回数+1」になること、直近掲載時の継続度ラベルが最も新しい掲載トピックのものになること、`trend`を持たない過去記事しかない場合は「不明」(null)になること、一度も掲載されていない話題は掲載回数0・報告回数1・直近掲載時のラベルnullになることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/publishRecords.ts`に`collectPublishRecords(articlesDir)`を実装する(既存の`reviewRecords.ts`と同じく、ディレクトリを引数で受け取る形にする)

- Task 9: 順位の採取と、採用基準の判定前の全項目の保持(仕様: [content-selection/design.md](../content-selection/design.md)「固定リストジャンルの候補を収集・判定する処理」手順2・手順7、requirements.md#機能要件-1〜3)
  - 🔴 順位付きランキング型の情報源をモックし、項目に情報源の順位がそのまま`rank`として入ること、musicのような上昇幅加点があるジャンルでも`rank`が`100 - strength`ではなく実際の順位になることを確認するテストを書く
  - 🔴 **採用基準を満たさなかった項目も観測用に保持されること**を確認するテストを書く: `newEntryOrRisingRank`のジャンルで「新規でも順位上昇でもない」項目が、掲載候補には含まれないが観測ログへ渡す一覧には含まれること(上位に居続ける作品が履歴から消えないことの回帰テスト。requirements.md#機能要件-2)
  - 🟢 `app/trend-digest/lib/fetchFixedListCandidates.ts`に`rank`の設定と、採用基準判定前の全項目を返す口を実装する

- Task 10: WebSearchジャンル側の観測項目の保持(仕様: [content-selection/design.md](../content-selection/design.md)「WebSearchジャンルの候補を収集・判定する処理」手順2〜3、requirements.md#機能要件-1〜3)
  - 🔴 応答JSONのパース部のテストを書く: 独立言及元数が`minIndependentSources`未満の話題が**候補には含まれないが観測ログへ渡す一覧には含まれること**(言及元が1件の段階の話題が履歴に残り、後に3件へ伸びたときの継続の開始日が実態とずれないことの回帰テスト)、上位`maxObservationsPerSource`件までに絞られること
  - 🟢 `scripts/trend-digest/collect-websearch-candidates.ts`のプロンプトと応答の扱いを、採用基準判定前の全話題を返す形に変更する

- Task 11: 地域情報の収集(固定リストジャンル側)(仕様: requirements.md#地域情報-15〜16、[content-selection/design.md](../content-selection/design.md)「固定リストジャンルの候補を収集・判定する処理」手順8)
  - 🔴 情報源に`region`を持たせたウォッチリストをモックし、日本の情報源だけで検出された項目は日本での強度に件数が入り海外での強度が0になること、両方の区分で検出された項目は両方に件数が入ること、そのジャンルに一方の区分の情報源が登録されていない場合はその区分が「不明」(null)になること、発祥地域・主な流行地域は「不明」のままになることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/fetchFixedListCandidates.ts`に地域情報の集計を追加する

- Task 12: 地域情報の収集(WebSearchジャンル側)(仕様: requirements.md#地域情報-15〜16、[content-selection/design.md](../content-selection/design.md)「WebSearchジャンルの候補を収集・判定する処理」手順7)(TDD対象外。Claude Code CLIのヘッドレス起動を伴うため)
  - `scripts/trend-digest/collect-websearch-candidates.ts`のプロンプトに、日本のメディア数・海外のメディア数・発祥地域・主な流行地域を返す指示と、判定できない項目は推測で埋めず「不明」で返す指示を追加する
  - 応答JSONの形式にこれらの項目を追加し、応答形式の分類ロジック(パース部)のみをテスト対象にする

- Task 13: 週次実行への組み込み(仕様: design.md「処理フロー」全体、[weekly-publish/design.md](../weekly-publish/design.md)「1回分の記事を生成する処理」)(TDD対象外。CLIの配線のため)
  - `scripts/trend-digest/collect-and-select.ts`に、項目収集の直後に観測ログを書き出す処理と、履歴の集約・ラベル判定・掲載実績の算出を呼び出す処理を追加する
  - 観測ログの書き出しに失敗した場合は非ゼロ終了し、記事生成に進まないようにする(design.md「エラーハンドリング」)
  - 記事を作らない回でも観測ログだけをコミット・PR作成するよう、週次実行のワークフローを更新する([weekly-publish/design.md](../weekly-publish/design.md)「記事生成をスキップする処理」)
  - **全候補の生成失敗・利用枠の枯渇で非ゼロ終了する場合も、その前に観測ログだけをコミット・push・PR作成する**([weekly-publish/design.md](../weekly-publish/design.md)「エラーハンドリング」)。観測ログを捨てて終了すると欠測週となり、以後の継続日数・報告回数が実態とずれるため

- Task 14: ログ出力(仕様: design.md「ログ」)
  - 🔴 観測件数・全話題の継続度ラベルごとの件数・注目度ラベルごとの件数・注目度をどちらの方法で決めたかのジャンルごとの内訳・地域が不明だった件数が標準エラー出力に出ることを確認するテストを書く(ジャンルごとの観測項目数と候補件数を分けたログはcontent-selection側のタスクで確認する)
  - 🟢 ログ出力を実装する

- Task 15: 運用開始直後・欠測週の挙動の確認(仕様: design.md「エラーハンドリング」)
  - 🔴 履歴ディレクトリが存在しない場合・観測ログが0件の場合に例外にならず、すべての話題が継続日数0の「流行前」として扱われること、注目度が情報源での位置から決まることを確認するテストを書く
  - 🔴 欠測週があっても継続日数(日付の差)が変わらないこと、欠測週がそのジャンルの実行回数に数えられないこと(注目度の切り替えが早まらないこと)を確認するテストを書く
  - 🟢 該当の分岐を実装する

- Task 16: 改訂した既存specの`> ステータス: 仕様確認中`行の削除(仕様: [.claude/skills/pr/references/spec-pr.md](../../../.claude/skills/pr/references/spec-pr.md))(TDD対象外)
  - 本specの実装が完了し、改訂分に対応するテストが揃った時点で、`trend-history`・`source-directory`・`content-selection`・`article-detail`・`content-generation`・`weekly-publish`・`source-review`の各`requirements.md`3行目の`> ステータス: 仕様確認中`を削除する
  - この行がある間、該当specの`requirements.md`/`design.md`は`check:spec-coverage`の対象から丸ごと外れ、**既に実装・テスト済みのルールまで検証が止まる**。改訂の実装が済んだら必ず外し、除外が残り続けないようにする
  - あわせて`scripts/spec-coverage-skip.json`を見直す。`> ステータス: 仕様確認中`行を外すとこれらのspecの項目がカバレッジ検査の対象に入るため、次を確認する:
    - 今回の改訂で採番がずれた項目のキーが現行の採番と一致しているか
    - TDD対象外の項目(Task 12・Task 13のCLI配線など)に理由付きのskipエントリが登録されているか
    - 実在しない項目を指すエントリ(孤立エントリ)が残っていないか
