# タスク分解: 情報源一覧(運営者専用)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

このspecは表示のみを担い、表示元のデータ([content-selection](../content-selection/tasks.md)の`watchlist.json`・`criteria.json`)の構造に依存する。`region`・`dev-trends`ジャンル・`history`の値を含む新しい構造が入ってから着手する。

- Task 1: 表示行の型定義(仕様: design.md「コンポーネント設計」)
  - `app/trend-digest/lib/buildSourceDirectory.ts`に`SourceDirectoryRow`を定義する(TDD対象外。型定義のみのため)。`Edition`/`Genre`は`app/trend-digest/lib/types.ts`、`WatchlistEntry`/`Criteria`は`app/trend-digest/lib/watchlistTypes.ts`からimportして再利用し、本specでは再定義しない

- Task 2: 採用基準を日本語にする処理(仕様: requirements.md#機能要件-4、design.md「採用基準を日本語にする処理」)
  - 🔴 上位何位以内かだけを持つジャンルが「上位5位以内」になること、新規ランクインまたは順位上昇だけを持つジャンルが「新規ランクイン、または順位上昇」になること、順位の改善幅もあわせて持つジャンルが改善幅を含む文言になること、両方を持つジャンル(書籍・漫画)が「かつ」で結ばれた文言になること、WebSearchジャンルが「独立した言及元が3件以上」になることを確認するテストを書く
  - 🔴 **文言が採用基準の値から導出されることを確認するテストを書く**: 採用基準の値(上位何位以内か・独立言及元の最低件数)を変えると表示文も変わること(ジャンルごとの固定文をページに書き込んでいないことの回帰テスト。requirements.md#機能要件-5)
  - 🟢 `buildSourceDirectory.ts`に採用基準の文言化を実装する

- Task 3: 表示行の組み立て(仕様: requirements.md#機能要件-1〜3・#表示の順序-6、design.md「表示する行を組み立てる処理」)
  - 🔴 全19ジャンル分の行が返ること、ジャンル名・編・選定方式が日本語で入ること、固定リストジャンルの行に情報源の名前・URL・地域区分がすべて入ること(複数情報源のジャンルは全件入ること)、WebSearchジャンルの行に検索の手がかりが入り情報源の一覧が空になることを確認するテストを書く
  - 🔴 **並び順のテストを書く**: エンタメ編9ジャンルが先・カルチャー・ライフスタイル編10ジャンルが後に並ぶこと、編の中が`GENRE_ORDER`と同じ順に並ぶこと(ウォッチリストの登録順が変わっても表示順が変わらないこと)
  - 🔴 表示元のデータを加工して別に持たないこと(`watchlist.json`に存在しない情報源・ジャンルが行に現れないこと)を確認するテストを書く
  - 🟢 `buildSourceDirectory.ts`に`buildSourceDirectory(watchlist, criteria): SourceDirectoryRow[]`を実装する

- Task 4: 表の描画(仕様: requirements.md#機能要件-1〜3、design.md「画面設計」)
  - 🔴 `SourceTable`に行を渡すと、5つの列見出し(ジャンル/編/選定方式/採用基準/情報源)と行数分の行が描画されること、情報源の名前が元URLへのリンク(新規タブ・`rel`に`noopener`)になること、地域区分が日本語で表示されること、WebSearchジャンルの行に検索の手がかりが表示されることを確認するテストを書く
  - 🔴 **`http`/`https`以外のスキームのURLがリンクにならないことを確認するテストを書く**(design.md「セキュリティ」)
  - 🟢 `app/trend-digest/admin/sources/components/SourceTable.tsx`を実装する

- Task 5: ページのログイン判定と組み立て(仕様: requirements.md#閲覧できる人-1・-3、design.md「ログイン状態に応じて表示を切り替える処理」)
  - 🔴 未ログインのときログインを促す画面が表示され表が描画されないこと、運営者本人と判定されたときだけ表が描画されること、運営者でないときは閲覧できない旨が表示されること、確認中は表が描画されないこと、確認自体が失敗したときは表を出さずエラーである旨が表示されることを確認するテストを書く(`app/lib/adminAuth.ts`をモックする)
  - 🔴 ログアウト後にログインを促す画面へ戻ることを確認するテストを書く
  - 🟢 `app/trend-digest/admin/sources/page.tsx`を実装する。ログイン判定は`app/lib/adminAuth.ts`の既存関数をそのまま使い、判定ロジックを本specに持ち込まない

- Task 6: 編集手段を持たないことの確認(仕様: requirements.md#表示する内容の範囲-5)
  - 🔴 表に入力欄・保存ボタン・削除ボタンが存在しないことを確認するテストを書く(表示専用であることの回帰テスト)
  - 🟢 (実装は不要。Task 4・5の時点で満たしている想定)

- Task 7: サイトマップからの除外の確認(仕様: requirements.md#閲覧できる人-2)
  - 🔴 `__tests__/sitemap.test.ts`に`/trend-digest/admin/sources`が含まれないことを確認するテストを追加する(既存の`/**/admin/**`除外ルールがこのページにも効いていることの確認)
  - 🟢 (実装は不要。既存ルールで満たしている想定。満たしていなければ`app/sitemap.ts`を修正する)
