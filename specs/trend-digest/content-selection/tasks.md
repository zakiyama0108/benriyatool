# タスク分解: ジャンル別情報源と採用基準

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: ウォッチリスト・採用基準データの作成(仕様: requirements.md#グループとジャンル、requirements.md#ジャンルごとの情報源・採用基準)
  - `app/trend-digest/lib/watchlistTypes.ts`に型を定義する(TDD対象外。型定義のみのため)。`Edition`/`Genre`は[article-detail](../article-detail/tasks.md)のTask 2で定義される`app/trend-digest/lib/types.ts`からimportして再利用し、本specでは再定義しない(design.md「データ設計(ウォッチリスト・採用基準)」参照)
  - `content/trend-digest/watchlist.json`にdesign.mdの初期値(全18ジャンル)をそのまま作成する
  - `content/trend-digest/criteria.json`にdesign.mdの初期値を作成する

- Task 2: 候補・選定結果の型定義(仕様: design.md「候補の型(前提)」)
  - 🔴 型自体はTask 3〜6のテストから間接的に検証する
  - 🟢 `app/trend-digest/lib/candidateTypes.ts`に`Candidate`/`SelectionResult`を定義する

- Task 3: 掲載済み話題の除外(仕様: requirements.md#掲載済み話題の再掲抑制-1、design.md「掲載済み話題を除外する処理」)
  - 🔴 過去記事の`sourceTitle`(正規化後)と一致する候補が除外されること、前後の空白・全角半角・大文字小文字の違いを吸収して一致判定すること、一致しない候補は残ることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/selection.ts`に`normalizeTitle(title)`と`excludeAlreadyPublishedTopics(candidates, publishedTitles)`を実装する

- Task 4: ジャンル内の絞り込み(仕様: requirements.md#機能要件-4、requirements.md#ジャンル内の絞り込み-1〜2、design.md「ジャンル内の絞り込みを行う処理」)
  - 🔴 候補が3件以上ある場合は`strength`降順で上位2件に絞られること、0〜2件の場合はそのまま採用されることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/selection.ts`に`narrowGenreCandidates(candidates, perGenreMax)`を実装する

- Task 5: 編全体の絞り込み(仕様: requirements.md#機能要件-5、requirements.md#配信全体の絞り込み-1、design.md「編全体の絞り込みを行う処理」)
  - 🔴 各ジャンルの1件目がすべて残ること、合計が10件を超える場合は2件目が固定リスト→WebSearchの順で残り枠に追加されること、最終的にジャンルの定義順に並ぶこと、全ジャンル0件なら`status: 'skipped'`になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/selection.ts`に`selectEditionTopics(genreCandidates, criteria, genreOrder): SelectionResult`を実装する

- Task 6: 固定リストジャンルの候補収集・判定(仕様: requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1〜9、design.md「固定リストジャンルの候補を収集・判定する処理」)
  - 🔴 情報源のレスポンス(順位付き一覧)をモックし、`rankThreshold`以内の項目が候補になること、`newEntryOrRisingRank`ジャンルは新規ランクイン(過去記事に同名タイトルがない)または順位変動が候補条件になること、`rankThreshold`と`newEntryOrRisingRank`の両方を持つジャンル(books-comics)は両方を満たす項目のみが候補になること(順位内でも新規ランクインでなければ候補にならない、新規ランクインでも順位圏外なら候補にならない)、1つの情報源が失敗しても他の情報源の結果は返ることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/fetchFixedListCandidates.ts`を実装する

- Task 7: WebSearchジャンルの候補収集・判定(仕様: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1〜6、design.md「WebSearchジャンルの候補を収集・判定する処理」)(TDD対象外。Claude Code CLIのヘッドレス起動を伴い、検索・判定自体に検証可能な決定的ロジックがないため)
  - `scripts/trend-digest/collect-websearch-candidates.ts`を実装する。対象ジャンルの`searchHints`をプロンプトに含めてClaude Code CLI(`claude -p ... --output-format json`)をヘッドレス起動し、独立情報源数が`minIndependentSources`以上の話題のみを候補としたJSON配列を生成する

- Task 8: 収集+選定のCLI化(仕様: design.md「関連するファイル」)
  - TDD対象外(Task 3〜7の薄い呼び出しのみのため)
  - `scripts/trend-digest/collect-and-select.ts`を実装する。edition・実行日を引数に取り、`content/trend-digest/articles/*.json`から掲載済みタイトル集合を読み込み、固定リスト・WebSearch双方の候補を収集し、選定結果(SelectionResult)をJSONとして標準出力する

- Task 9: 情報源・ジャンルごとの取得件数ログ(仕様: requirements.md#情報源の健全性監視-1、design.md「ログ」)
  - 🔴 収集処理がジャンルごとの候補件数を返し、0件のジャンル・情報源が警告として区別できることを確認するテストを書く
  - 🟢 `collect-and-select.ts`が情報源・ジャンルごとの取得件数を集計し、0件のものを`WARN`付きでstderrに出力する
