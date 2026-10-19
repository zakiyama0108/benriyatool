# タスク分解: カテゴリ・情報源と採用基準

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: 情報源・採用基準データの作成(仕様: requirements.md#情報源(固定リスト)-2、requirements.md#採用基準)
  - `app/news-digest/lib/watchlistTypes.ts`に型を定義する(TDD対象外。型定義のみのため)
  - `content/news-digest/watchlist.json`にrequirements.md#情報源(固定リスト)-2の表と完全一致する10件を作成する(各情報源の実際のRSSフィードURル・公開ページURLは実装時に公式サイトで確認して設定する。共同通信・東洋経済オンライン・神奈川新聞はrobots.txtの実機確認結果に基づきYahoo!ニュース公式RSS経由とする。design.md参照)
  - `content/news-digest/criteria.json`にdesign.mdの初期値(`weeklyTopicCountMax`・`minCorroboratingSources`)を設定する

- Task 2: 候補・選定結果の型定義(仕様: design.md「データ設計」)
  - 🔴 型自体はTask 3〜4のテストから間接的に検証する
  - 🟢 `app/news-digest/lib/candidateTypes.ts`に`Candidate`/`SelectionResult`を定義する

- Task 3: 情報源からの候補収集(仕様: requirements.md#データ取得方法-1)
  - 🔴 RSSフィード・公開ページのレスポンスをモックし、直近1週間以内の項目のみが候補として抽出されること、1週間より古い項目は除外されること、1つの情報源が失敗しても他の情報源の結果は返ることを確認するテストを書く
  - 🟢 `app/news-digest/lib/fetchCandidates.ts`を実装する

- Task 4: 掲載済み記事の除外(仕様: requirements.md#掲載済み記事の再掲抑制-8、design.md「掲載済み記事を除外する処理」)
  - 🔴 掲載済みURL集合に含まれる`url`の候補(ホスト名の大文字小文字・クエリ文字列・末尾スラッシュの揺れを含む)が除外されること、含まれない候補は残ることを確認するテストを書く
  - 🟢 `app/news-digest/lib/selection.ts`に`excludeAlreadyPublished(candidates, publishedUrls)`を実装する(URL正規化を含む)

- Task 5: カテゴリごとの件数上限の適用(仕様: requirements.md#1週あたりの掲載件数-6〜7、design.md「1週分のトピックを選び出す処理」)
  - 🔴 以下をテストで確認する: `meetsCriteria: true`の総合候補が3件を超える場合は公開日時が新しい順に3件へ絞る/経済・ビジネスは2件までに絞る/`meetsCriteria: true`の候補が0件のカテゴリはそのカテゴリの掲載なしとして返る/神奈川ローカル・育児はエージェントが選んだ1件をそのまま採用し`meetsCriteria: false`なら`belowCriteria: true`にする/全カテゴリが掲載なしの場合はスキップ結果を返す
  - 🟢 `selectWeeklyTopics(judgedCandidates, criteria): SelectionResult`を実装する
  - 🔵 カテゴリごとの絞り込みロジックを関数分割して読みやすくする

- Task 6: 候補のグループ化・採用基準判定のオーケストレーション(仕様: design.md「候補をグループ化し採用基準を判定する処理」)
  - TDD対象外(エージェント(Claude Code CLI)の推論結果に依存するオーケストレーションのため)。ただし次のみテストする:
  - 🔴 エージェント応答が指定のJSON形式でない場合、そのカテゴリを「候補なし」として扱い例外を投げずに処理を継続することを確認するテストを書く
  - 🟢 `scripts/news-digest/collect-and-select.ts`にエージェント応答のパース・フォールバック処理を実装する

- Task 7: 収集+選定のCLI化(仕様: design.md「関連するファイル」)
  - TDD対象外(fetchCandidates/excludeAlreadyPublished/selectWeeklyTopicsの薄い呼び出しのみのため。ロジック自体はTask 3〜6でテスト済み)
  - `scripts/news-digest/collect-and-select.ts`を実装する。実行日を引数に取り、選定結果(基準未達理由・スキップ判定を含む)をJSONとして標準出力する

- Task 8: 情報源ごとの取得件数ログ(仕様: requirements.md#情報源の健全性監視-3、design.md「ログ」)
  - 🔴 収集処理が情報源ごとの件数を返し、0件の情報源が警告として区別できることをテストする(`fetchCandidates`の戻り値または集計関数の単体テスト)
  - 🟢 `fetchCandidates`が情報源ごとの取得件数を集計できるようにし、`collect-and-select.ts`が0件の情報源を`WARN`付きでstderrに出力する

- Task 9(バグ修正・2026-10-03): 2026-10-03の本番週次配信で総合・経済/ビジネスが0件になったバグの修正(仕様: requirements.md#情報源(固定リスト)-2、design.md「データ設計(情報源・採用基準)」「情報源から候補を収集する処理」)
  - 原因1: NHK NEWS WEBのRSS(`https://www3.nhk.or.jp/rss/news/cat4.xml`・`cat6.xml`)が2026年8月から更新停止していた。現行ドメインの`https://www.nhk.or.jp/rss/news/cat4.xml`・`cat6.xml`に`watchlist.json`を更新
  - 原因2: 神奈川県公式サイトのお知らせ一覧が`<dt>日付</dt><dd>...<a>見出し</a>...</dd>`形式で、`parseOfficialPageEntries`(`app/news-digest/lib/fetchCandidates.ts`)が`<li>`パターンにしか対応していなかった。`<dt>/<dd>`パターンにも対応するよう拡張(既存の`<li>`パターンのテストは維持)
    - 🔴 `<dt>/<dd>`形式の公式ページから新着項目を抽出できることを確認する失敗テストを`__tests__/news-digest/lib/fetchCandidates.test.ts`に追加
    - 🟢 `parseOfficialPageEntries`を拡張して`<dt>/<dd>`パターンにも対応
  - 原因3: 時事通信・日本経済新聞(電子版)は技術的にスクレイピング不可能と判明したため情報源リストから削除(日付抽出・SPA構造の問題。requirements.md参照)
  - 対応: 総合・経済/ビジネスの採用基準([4])を満たす候補の母数を確保するため、産経新聞・ANN(テレビ朝日系)・FNNプライムオンライン(総合)、ダイヤモンド・オンライン・BUSINESS INSIDER JAPAN(経済/ビジネス)をYahoo!ニュース公式RSS経由で追加し、`watchlist.json`・`__tests__/news-digest/lib/watchlistData.test.ts`を更新(総合5件・経済/ビジネス3件・計13件)
