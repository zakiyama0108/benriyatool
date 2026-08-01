# タスク分解: 情報源ウォッチリストと採用基準

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: ウォッチリスト・採用基準データの作成(仕様: requirements.md#情報源(ウォッチリスト)-1、requirements.md#採用基準)
  - `app/ai-dev-digest/lib/watchlistTypes.ts`に型を定義する(TDD対象外。型定義のみのため)
  - `content/ai-dev-digest/watchlist.json`に13件のウォッチリストを作成する(requirements.mdの表と完全一致させる)
  - `content/ai-dev-digest/criteria.json`にdesign.mdの初期値を設定する

- Task 2: 候補・選定結果の型定義(仕様: design.md「データ設計」)
  - 🔴 型自体はTask 3〜4のテストから間接的に検証する
  - 🟢 `app/ai-dev-digest/lib/candidateTypes.ts`に`Candidate`/`SelectionResult`を定義する

- Task 3: 採用基準の判定(仕様: requirements.md#採用基準-4〜8)
  - 🔴 公式組織・Simon Willisonブログは常に基準を満たすこと、YouTube動画は直近平均×倍率を上回る場合のみ満たすこと、Qiita/Zennはいいね数の閾値で判定されることを、種別ごとにテストで確認する
  - 🟢 `app/ai-dev-digest/lib/selection.ts`に`meetsCriteria(candidate, criteria): boolean`を実装する
  - 🔵 乖離内容の文言生成(`describeShortfall`)を切り出す

- Task 4: 1日分のトピック選定(仕様: requirements.md#1日の掲載件数-9〜10、design.md「1日分のトピックを選び出す処理」)
  - 🔴 以下をテストで確認する: 基準を満たす候補が3〜5件ならそのまま採用/6件以上なら種別分散+新しい順で5件に絞る/2件しかない場合は基準未達候補で3件まで補いbelowCriteriaが立つ/候補が合計2件未満ならスキップ結果を返す
  - 🟢 `selectDailyTopics(candidates, criteria): SelectionResult`を実装する
  - 🔵 選定理由(乖離が小さい順の補充ロジック)を関数分割して読みやすくする

- Task 5: 情報源からの候補収集(仕様: requirements.md#データ取得方法-1)
  - 🔴 YouTube Data API/RSS/Qiita APIのレスポンスをモックし、正しく`Candidate`型に変換されること、1つの情報源が失敗しても他の情報源の結果は返ること、Zennのいいね数がHTMLから読み取れない場合はその記事が除外されることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/fetchCandidates.ts`を実装する

- Task 6: 収集+選定のCLI化(仕様: design.md「関連するファイル」)
  - TDD対象外(fetchCandidates/selectDailyTopicsの薄い呼び出しのみのため。ロジック自体はTask 3〜5でテスト済み)
  - `scripts/ai-dev-digest/collect-and-select.ts`を実装する。実行日を引数に取り、選定結果(基準未達理由・スキップ判定を含む)をJSONとして標準出力する
