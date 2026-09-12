# タスク分解: 付箋(記事トピックの個人メモ・ブックマーク)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## データ基盤

- Task 1: `news_digest_bookmarks`テーブルのマイグレーション(design.md「データベース設計」のSQL)
  - `supabase/migrations/<timestamp>_create_news_digest_bookmarks.sql`を作成する(テーブル作成+本人行のみRLS(select/insert/update/delete)+一意制約+CHECK制約+benriyatool_readonly SELECT専用ポリシー)
  - マイグレーションファイル単独のPRとしてマージし、`deploy.yml`のmigrateジョブが成功したことを確認する
  - design.md「T0(マイグレーション適用)の実機確認」の5項目を実機で確認する

## 付箋のCRUD

- Task 2: 付箋の取得・作成・更新・削除処理(仕様: requirements.md#トピックへの付箋-1〜4、requirements.md#付箋の編集・削除-7〜9)
  - 🔴 Supabaseクライアントをモックし、`fetchBookmarksByArticleDate`が記事日付で絞り込んで`Map<topicId, BookmarkSummary>`を返すこと、`fetchAllBookmarks`が全件を編集日時の新しい順で返すこと、`createBookmark`/`updateBookmark`/`deleteBookmark`が正しいカラム名・IDで呼ばれ成功/失敗を返すことを確認するテストを書く
  - 🟢 `app/news-digest/lib/bookmarks.ts`に実装する(ai-dev-digestの`bookmarks.ts`と同じ関数構成)

- Task 3: トピック索引の構築(仕様: design.md「関連するファイル」)
  - 🔴 全記事から「記事日付:トピックID」→トピック見出しの索引が構築されることを確認するテストを書く
  - 🟢 `app/news-digest/lib/topicIndex.ts`に`buildTopicIndex(articles)`を実装する

## 画面コンポーネント

- Task 4: 付箋パネル(仕様: requirements.md#トピックへの付箋-1〜9、design.md「新規に付箋を貼る処理」〜「付箋を削除する処理」)
  - 🔴 未付箋時は「付箋を貼る」操作のみ表示されること、操作するとメモ入力欄が展開すること、トリムした文字列が空文字または200文字超で保存ボタンが無効化されること、保存成功で「付箋あり」表示に切り替わること、保存失敗で入力欄が保持されエラー表示されること、付箋あり時は「編集」「削除」操作が表示されること、削除成功で「未付箋」に戻ることを確認するテストを書く
  - 🟢 `app/news-digest/components/BookmarkPanel.tsx`を実装する(ai-dev-digestのBookmarkPanel.tsxと同一の実装)

- Task 5: 記事詳細ページへのBookmarkPanel配線(仕様: requirements.md#トピックへの付箋-5〜6)
  - 🔴 ログインセッションがある場合のみBookmarkPanelが描画されること、記事内の自分の付箋がトピックIDで正しく引き当てられて`initialBookmark`に渡ることを確認するテストを書く
  - 🟢 `TopicSection`に`bookmark`propを追加しBookmarkPanelを条件付き描画する。`ArticleDetailView`にセッション確立後`fetchBookmarksByArticleDate`を呼び出す処理を実装し、結果を`bookmarks`としてTopicSectionへ渡す(失敗時はすべて未付箋として扱いコンソールにエラー出力)
  - 実装順序の注意: [article-detail/tasks.md](../article-detail/tasks.md)のTask 10(isAdmin配線)と同じ`TopicSection.tsx`/`ArticleDetailView.tsx`を変更する

- Task 6: 付箋一覧の1項目(仕様: requirements.md#付箋した記事一覧-11〜13)
  - 🔴 トピック見出し(対象トピックへのリンク)が表示されること、配下にBookmarkPanelが表示され編集・削除がその場で完結することを確認するテストを書く
  - 🟢 `app/news-digest/components/BookmarkListItem.tsx`を実装する(ai-dev-digestのBookmarkListItem.tsxと同一の実装)

- Task 7: 付箋一覧ページ本体(仕様: requirements.md#付箋した記事一覧-10・14〜15、design.md「付箋一覧を取得して表示する処理」)
  - 🔴 セッション確認中・取得中はローディング表示のみになること、未ログインはログイン導線のみ表示されること、ログイン中で0件は「まだ付箋がありません」が表示されること、1件以上は保存/編集日時の新しい順に表示されること、対応するトピックが記事データに見つからない付箋は一覧から除外されることを確認するテストを書く
  - 🟢 `app/news-digest/components/BookmarkListView.tsx`を実装する(ai-dev-digestのBookmarkListView.tsxと同一の実装)

- Task 8: ログイン状態表示(仕様: requirements.md#画面共通のログイン導線-16)
  - 🔴 未ログイン時は「ログイン」ボタンのみ表示されること、ログイン中はメールアドレス・「付箋一覧」リンク・ログアウトボタンが表示されることを確認するテストを書く
  - 🟢 `app/news-digest/components/LoginStatus.tsx`を実装する(ai-dev-digestのLoginStatus.tsxと同一の実装。リンク先を`/news-digest/bookmarks`に変更)

## ページ組み立て

- Task 9: 付箋一覧ページ(仕様: requirements.md#付箋した記事一覧-10)
  - `app/news-digest/bookmarks/page.tsx`を実装する。`getAllArticles()`から`buildTopicIndex`でトピック索引を組み立て、`BookmarkListView`へpropsで渡す
  - page.tsx自体はカバレッジ計測対象外。新規テストは追加せずTask 2〜7のユニットテストで担保する

## 利用規約

- Task 10: プライバシーポリシーの更新(仕様: requirements.md#依存関係)
  - TDD対象外(静的な文言追記のため)
  - `app/legal/page.tsx`に、読者本人の付箋メモ(自由記述、200文字まで)を保存する旨を追記する(life-money-simのマイシナリオ機能の記載パターンを踏襲する)
