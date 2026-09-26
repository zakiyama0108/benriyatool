# タスク分解: 情報源ウォッチリストと採用基準

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: ウォッチリスト・採用基準データの作成(仕様: requirements.md#情報源(ウォッチリスト)-1、requirements.md#採用基準)
  - `app/ai-dev-digest/lib/watchlistTypes.ts`に型を定義する(TDD対象外。型定義のみのため)
  - `content/ai-dev-digest/watchlist.json`にウォッチリストを作成する(requirements.md#情報源(ウォッチリスト)-1の表と完全一致させる。件数はその後 Task 9 で18件に更新)
  - `content/ai-dev-digest/criteria.json`にdesign.mdの初期値を設定する

- Task 2: 候補・選定結果の型定義(仕様: design.md「データ設計」)
  - 🔴 型自体はTask 3〜4のテストから間接的に検証する
  - 🟢 `app/ai-dev-digest/lib/candidateTypes.ts`に`Candidate`/`SelectionResult`を定義する

- Task 3: 採用基準の判定(仕様: requirements.md#採用基準-4〜8)
  - 🔴 公式組織・個人ブログ(`individual-blog`)は常に基準を満たすこと、YouTube動画は直近平均×倍率を上回る場合のみ満たすこと、Qiita/Zennはいいね数の閾値で判定されることを、種別ごとにテストで確認する
  - 🟢 `app/ai-dev-digest/lib/selection.ts`に`meetsCriteria(candidate, criteria): boolean`を実装する
  - 🔵 乖離内容の文言生成(`describeShortfall`)を切り出す

- Task 4: 1日分のトピック選定(仕様: requirements.md#1日の掲載件数-9〜10、design.md「1日分のトピックを選び出す処理」)
  - 🔴 以下をテストで確認する: 基準を満たす候補が3〜5件ならそのまま採用/6件以上なら種別分散+新しい順で5件に絞る/2件しかない場合は基準未達候補で3件まで補いbelowCriteriaが立つ/基準を満たす候補・満たさない候補を合わせても3件に満たないが1件以上ある場合はその件数のまま採用しbelowCriteriaが立つ/候補が合計0件ならスキップ結果を返す
  - 🟢 `selectDailyTopics(candidates, criteria): SelectionResult`を実装する
  - 🔵 選定理由(乖離が小さい順の補充ロジック)を関数分割して読みやすくする

- Task 5: 情報源からの候補収集(仕様: requirements.md#データ取得方法-1)
  - 🔴 YouTube Data API/RSS/Qiita APIのレスポンスをモックし、正しく`Candidate`型に変換されること、1つの情報源が失敗しても他の情報源の結果は返ること、Zennのいいね数がHTMLから読み取れない場合はその記事が除外されることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/fetchCandidates.ts`を実装する

- Task 6: 収集+選定のCLI化(仕様: design.md「関連するファイル」)
  - TDD対象外(fetchCandidates/selectDailyTopicsの薄い呼び出しのみのため。ロジック自体はTask 3〜5でテスト済み)
  - `scripts/ai-dev-digest/collect-and-select.ts`を実装する。実行日を引数に取り、選定結果(基準未達理由・スキップ判定を含む)をJSONとして標準出力する

## 話題の関連性フィルタの実装(2026-08第2次改定)

- Task 7: 話題の関連性フィルタ(仕様: requirements.md#話題の関連性-12、design.md「話題の関連性フィルタを適用する処理」)
  - 🔴 原文タイトルに`topicExcludeKeywords`のいずれかを(大文字小文字を区別せず、日英とも)含む候補が除外されること、含まない候補は通常どおり採用基準判定に進むこと、`topicExcludeKeywords`が空配列のときは何も除外されないことを確認するテストを書く。あわせて、除外候補が他の採用基準を満たしていても選定結果に含まれないこと、除外により残る候補が基準未達のみでもその候補で補われること、すべて除外され実在候補が残らない場合はスキップ結果になることを`selectDailyTopics`のテストとして追加する
  - 🟢 `app/ai-dev-digest/lib/selection.ts`に`isTopicExcluded(candidate, criteria)`を実装し、`selectDailyTopics`の先頭(採用基準判定より前)でこのフィルタを適用する
  - `app/ai-dev-digest/lib/watchlistTypes.ts`の`Criteria`型に`topicExcludeKeywords: string[]`を追加する(TDD対象外。型定義のみのため)
  - `content/ai-dev-digest/criteria.json`の`topicRelevanceGuideline`(未使用の自由記述フィールド)を、実際にフィルタで使う`topicExcludeKeywords`配列に置き換える(TDD対象外。データ変更のみのため)

## 情報源内の重複抑制の実装(selection.ts に実装済み・design.md/tasks.md への追随分)

- Task 8: 情報源内の重複抑制(仕様: requirements.md#情報源内の重複掲載の抑制-13、design.md「情報源内の重複を抑制する処理」)
  - 🔴 `duplicateSuppressionSourceTypes`に含まれる種別で同一`sourceId`の候補が複数あるとき最新1件だけ残ること、含まれない種別・異なる`sourceId`は絞られないこと、`selectDailyTopics`に統合され採用基準判定より前に適用されることをテストする
  - 🟢 `app/ai-dev-digest/lib/selection.ts`に`deduplicateSameSourceCandidates(candidates, criteria)`を実装し、`selectDailyTopics`の先頭付近で適用する
  - `Criteria`型に`duplicateSuppressionSourceTypes: SourceType[]`、`criteria.json`に`["individual-blog"]`を追加する(TDD対象外)

## 情報源の追加・採用基準の調整(requirements.md [1][5][6][7][14]・情報源の健全性監視[2])

- Task 9: ウォッチリストの更新(仕様: requirements.md#情報源(ウォッチリスト)-1)
  - TDD対象外(データ変更)。`content/ai-dev-digest/watchlist.json`を更新する:
    - LangChainの`feedUrl`を有効なフィード(`https://blog.langchain.dev/rss.xml`)に修正
    - DeepLearning.AIから`rss`チャンネルを削除(YouTube専用に)
    - `github`(github.blog)・`google-developers`(blog.google 開発者向け)・`vscode`(code.visualstudio.com)を`official`で追加
    - `interconnects`(interconnects.ai)・`martin-fowler`(martinfowler.com)を`individual-blog`で追加
  - `__tests__/ai-dev-digest/lib/watchlistData.test.ts`の件数・形式チェックを18件に追随させる

- Task 10: 個人ブログの本文量による除外(仕様: requirements.md#採用基準-6、design.md「情報源から候補を収集する処理」)
  - 🔴 RSS本文(`content:encoded`/`summary`/`description`/atom `content`)のタグ除去後の文字数が`minIndividualBlogBodyChars`未満の`individual-blog`候補が`fetchRssCandidates`の結果に含まれないこと、閾値以上なら含まれること、`official`のブログは本文量で除外されないことをテストする
  - 🟢 `fetchRssCandidates`(および呼び出し元)を本文量で絞り込むよう変更する。`Criteria`型に`minIndividualBlogBodyChars: number`、`criteria.json`に`150`を追加する

- Task 11: 個人YouTubeの直近複数本評価(仕様: requirements.md#採用基準-5、design.md「情報源から候補を収集する処理」「採用基準を判定する処理」)
  - 🔴 個人YouTubeチャンネルで直近`youtubeCandidateVideoCount`本が候補になること、各候補が候補群より後の`youtubeRecentVideoWindow`本の平均×`youtubeAboveAverageRatio`と比較されること、公式組織YouTubeは従来どおり最新1本のみであることをテストする
  - 🟢 `fetchYoutubeCandidates`を直近`youtubeCandidateVideoCount`本を候補にするよう変更する。`Criteria`型に`youtubeCandidateVideoCount: number`、`criteria.json`に`5`を追加する
  - `app/ai-dev-digest/lib/candidateTypes.ts`の`recentAverageViews`のコメントを「候補群を除いた直後の`youtubeRecentVideoWindow`本の平均」に同期する

- Task 12: Qiitaの対象期間の変更(仕様: requirements.md#採用基準-7、design.md「情報源から候補を収集する処理」)
  - 🔴 公開後`qiitaMaxAgeDays`日以内の記事のみが候補になること、期間外の記事は除外されること、いいね数判定は従来どおり`qiitaMinLikes`であることをテストする
  - 🟢 `fetchQiitaCandidates`を公開日時で絞り込むよう変更する(新しい順にページを辿り、期間外に達したら打ち切る)。`Criteria`型に`qiitaMaxAgeDays: number`、`criteria.json`に`60`を追加する

- Task 13: 掲載済み記事の除外(仕様: requirements.md#掲載済み記事の再掲抑制-14、design.md「掲載済み記事を除外する処理」)
  - 🔴 掲載済みURL集合に含まれる`url`の候補が`selectDailyTopics`の結果から除外されること、含まれない候補は残ること、全候補が除外されるとスキップ結果になることをテストする
  - 🟢 `selection.ts`に掲載済みURLを除外する純粋関数を実装し`selectDailyTopics`の先頭で適用する(掲載済みURL集合を引数で受け取る)。`scripts/ai-dev-digest/collect-and-select.ts`が`content/ai-dev-digest/articles/*.json`を読んでURL集合を渡す

- Task 14: 情報源ごとの取得件数ログ(仕様: requirements.md#情報源の健全性監視-2、design.md「ログ」)
  - 🔴 収集処理が情報源ごとの件数を返し、0件の情報源が警告として区別できることをテストする(`fetchAllCandidates`の戻り値または集計関数の単体テスト)
  - 🟢 `fetchAllCandidates`が情報源ごとの取得件数を集計できるようにし、`collect-and-select.ts`が0件の情報源を`WARN`付きでstderrに出力する
