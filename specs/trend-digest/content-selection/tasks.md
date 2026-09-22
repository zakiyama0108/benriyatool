# タスク分解: ジャンル別情報源と採用基準

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: ウォッチリスト・採用基準データの作成(仕様: requirements.md#グループとジャンル、requirements.md#ジャンルごとの情報源・採用基準、requirements.md#情報源の地域区分)
  - `app/trend-digest/lib/watchlistTypes.ts`に型を定義する(TDD対象外。型定義のみのため)。`Edition`/`Genre`は[article-detail](../article-detail/tasks.md)のTask 2で定義される`app/trend-digest/lib/types.ts`からimportして再利用し、本specでは再定義しない(design.md「データ設計(ウォッチリスト・採用基準)」参照)。`SourceRegion`を追加し、`WatchlistEntry.sources`の各要素に`region`を、`Criteria`に`history`を持たせる
  - `content/trend-digest/watchlist.json`にdesign.mdの初期値(全19ジャンル。各情報源に`region`、カルチャー編に`dev-trends`を含む)をそのまま作成する
  - `content/trend-digest/criteria.json`にdesign.mdの初期値(`dev-trends`の`genreCriteria`と`history`の閾値を含む)を作成する
  - 🔴 `watchlist.json`の全ジャンルが`GENRE_ORDER`の19ジャンルと過不足なく一致すること、`criteria.json`の`genreCriteria`が全19ジャンルを網羅すること、固定リストジャンルの全情報源に`region`があることを確認するテストを書く

- Task 2: 候補・選定結果の型定義(仕様: design.md「候補の型(前提)」)
  - 🔴 型自体はTask 3〜6のテストから間接的に検証する
  - 🟢 `app/trend-digest/lib/candidateTypes.ts`に`Candidate`(地域情報の4項目を含む)・`PublishableCandidate`・`SelectionResult`を定義する

- Task 3: 中長期トレンドの絞り込み(仕様: requirements.md#中長期トレンドの絞り込み-1〜3、design.md「中長期トレンドの絞り込みを行う処理」)
  - 🔴 ステータスがGROWING/ESTABLISHED/STABLEの候補だけが残ること、NEW/SHORT_TERM/EMERGING/DECLININGの候補が除外されること、除外した件数がステータスごとに数えられること、全候補が除外されても例外にならず空の結果を返すことを確認するテストを書く
  - 🟢 `app/trend-digest/lib/selection.ts`に`filterPublishableCandidates(candidates, judgements)`を実装する。ステータス判定は[trend-history](../trend-history/tasks.md)のTask 5〜6の結果を受け取るだけで、ここでは再判定しない

- Task 4: 掲載済み話題の再掲抑制(仕様: requirements.md#掲載済み話題の再掲抑制-1〜4、design.md「掲載済み話題を除外する処理」)
  - 🔴 過去に掲載がない候補はそのまま残り報告回数が1になること、前回掲載時と今回のステータスが同じ候補が除外されること、ステータスが変わった候補は続報として残り報告回数が「過去の掲載回数+1」になること、前回掲載時のステータスが不明な候補は除外されること、前後の空白・全角半角・大文字小文字の違いを吸収して同一話題と判定することを確認するテストを書く
  - 🟢 `app/trend-digest/lib/selection.ts`に`excludeUnchangedTopics(candidates, judgements, publishRecords)`を実装する。`normalizeTitle`は[trend-history](../trend-history/tasks.md)と共用し、正規化ルールを二重に持たない

- Task 5: ジャンル内の絞り込み(仕様: requirements.md#機能要件-5、requirements.md#ジャンル内の絞り込み-1〜2、design.md「ジャンル内の絞り込みを行う処理」)
  - 🔴 候補が3件以上ある場合は`strength`降順で上位2件に絞られること、0〜2件の場合はそのまま採用されることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/selection.ts`に`narrowGenreCandidates(candidates, perGenreMax)`を実装する

- Task 6: 編全体の絞り込み(仕様: requirements.md#機能要件-6、requirements.md#配信全体の絞り込み-1、design.md「編全体の絞り込みを行う処理」)
  - 🔴 各ジャンルの1件目がすべて残ること、合計が10件を超える場合は2件目が固定リスト→WebSearchの順で残り枠に追加されること、最終的にジャンルの定義順に並ぶこと、カルチャー編は1件目だけで10ジャンル分となり2件目が入らないこと、全ジャンル0件なら`status: 'skipped'`になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/selection.ts`に`selectEditionTopics(genreCandidates, criteria, genreOrder): SelectionResult`を実装する

- Task 7: 固定リストジャンルの候補収集・判定(仕様: requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1〜9、design.md「固定リストジャンルの候補を収集・判定する処理」)
  - 🔴 情報源のレスポンス(順位付き一覧)をモックし、`rankThreshold`以内の項目が候補になること、`newEntryOrRisingRank`ジャンルは新規ランクイン(過去記事に同名タイトルがない)または順位変動が候補条件になること、`rankThreshold`と`newEntryOrRisingRank`の両方を持つジャンル(books-comics)は両方を満たす項目のみが候補になること(順位内でも新規ランクインでなければ候補にならない、新規ランクインでも順位圏外なら候補にならない)、1つの情報源が失敗しても他の情報源の結果は返ることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/fetchFixedListCandidates.ts`を実装する。情報源の`region`から日本での強度・海外での強度を数える処理は[trend-history](../trend-history/tasks.md)のTask 8で追加する

- Task 8: WebSearchジャンルの候補収集・判定(仕様: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1〜7、design.md「WebSearchジャンルの候補を収集・判定する処理」)(TDD対象外。Claude Code CLIのヘッドレス起動を伴い、検索・判定自体に検証可能な決定的ロジックがないため)
  - `scripts/trend-digest/collect-websearch-candidates.ts`を実装する。対象ジャンルの`searchHints`をプロンプトに含めてClaude Code CLI(`claude -p ... --output-format json`)をヘッドレス起動し、独立情報源数が`minIndependentSources`以上の話題のみを候補としたJSON配列を生成する
  - `dev-trends`(開発手法・開発サービス)には、個々のリリース・アップデートのニュースを候補にせず、複数の情報源が開発の進め方・道具立ての変化として論じている潮流だけを候補にする指示をプロンプトに含める(ai-dev-digestとの重複を避けるため)
  - 地域情報を返す指示の追加は[trend-history](../trend-history/tasks.md)のTask 9で行う

- Task 9: 収集+選定のCLI化(仕様: design.md「関連するファイル」)
  - TDD対象外(Task 3〜7の薄い呼び出しのみのため)
  - `scripts/trend-digest/collect-and-select.ts`を実装する。edition・実行日を引数に取り、固定リスト・WebSearch双方の候補を収集し、観測ログを書き出したうえで(→[trend-history](../trend-history/tasks.md)のTask 3・10)、履歴からのステータス判定・掲載実績の算出結果を使って絞り込み、選定結果(SelectionResult)をJSONとして標準出力する

- Task 10: 情報源・ジャンルごとの取得件数ログ(仕様: requirements.md#情報源の健全性監視-1〜2、design.md「ログ」)
  - 🔴 収集処理がジャンルごとの候補件数を返し、0件のジャンル・情報源が警告として区別できること、中長期トレンドの絞り込みで除外した件数がステータスごとに出ること、再掲を見送った件数と続報として再掲する件数が出ること、掲載可能な候補が0件のとき「収集自体が0件」と「絞り込みで全件除外」が区別して出ることを確認するテストを書く
  - 🟢 `collect-and-select.ts`が情報源・ジャンルごとの取得件数と絞り込みの内訳を集計し、0件のものを`WARN`付きでstderrに出力する
