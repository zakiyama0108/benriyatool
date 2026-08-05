# タスク分解: 付箋(記事トピックの個人メモ・ブックマーク)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## データ基盤

- Task 1: `ai_dev_digest_bookmarks`テーブルのマイグレーション(design.md「データベース設計」のSQL、適用基盤: docs/adr/0003)
  - `supabase/migrations/<timestamp>_create_ai_dev_digest_bookmarks.sql`を作成する(テーブル作成+一意制約+`memo`のCHECK制約(200文字以内)+authenticatedのSELECT/INSERT/UPDATE/DELETE専用ポリシー)
  - マイグレーションファイル単独のPRとしてマージし、`deploy.yml`のmigrateジョブが成功したことを確認する
  - 適用後、design.md「データベース設計」のT0確認事項(本人の行のみ操作可能・他人の行が見えない・未ログインで操作不可・一意制約が効く・CHECK制約が効く)を実機で確認する
  - 以降のタスク(付箋の保存・動作確認)より前に適用が完了していることを確認する

- Task 2: 付箋データの取得・保存・更新・削除処理(仕様: design.md「データベース設計」「新規に付箋を貼る処理」「付箋を編集する処理」「付箋を削除する処理」)
  - 🔴 Supabaseクライアントをモックし、`fetchBookmarksByArticleDate`が指定した記事日付の自分の付箋をトピックIDをキーにしたMapで返すこと、`fetchAllBookmarks`が`updated_at`の新しい順で全件返すこと、`createBookmark`/`updateBookmark`/`deleteBookmark`が正しいカラム名で呼び出され成功/失敗を判別できる戻り値を返すことを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/bookmarks.ts`に`fetchBookmarksByArticleDate`/`fetchAllBookmarks`/`createBookmark`/`updateBookmark`/`deleteBookmark`を実装する(`updateBookmark`は`updated_at`に現在時刻を明示的にセットする)

- Task 3: 記事タイトル・トピック見出しの索引(仕様: design.md「付箋一覧を取得して表示する処理」手順3)
  - 🔴 複数記事・複数トピックのフィクスチャに対し、`buildTopicIndex`が「記事日付:トピックID」をキーに記事タイトル(`buildArticleTitle`)とトピック見出しを引き当てられること、存在しないキーで検索した場合は`undefined`を返すことを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/topicIndex.ts`に`buildTopicIndex(articles: Article[])`を実装する

## 記事詳細ページでの付箋操作

- Task 4: 付箋パネル(仕様: requirements.md#トピックへの付箋-1〜4、requirements.md#付箋の編集・削除-7〜9、design.md「新規に付箋を貼る処理」〜「付箋を削除する処理」「状態管理」)
  - 🔴 `initialBookmark`が`null`の場合は「付箋を貼る」操作のみ表示されること、「付箋を貼る」操作で入力欄が展開すること、トリムした入力が空文字または200文字超の場合は保存操作が無効化されること、保存成功で入力欄が閉じ保存内容が表示されること、保存失敗で入力欄が開いたまま失敗表示・入力内容が残ること、`initialBookmark`がある場合は保存済みメモと「編集」「削除」操作が表示されること、「編集」操作で保存済み内容を初期値に入力欄が展開すること、削除成功で「未付箋」表示に戻ること、削除失敗で「付箋あり」表示のまま失敗表示されることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/components/BookmarkPanel.tsx`を実装する(`app/ai-dev-digest/lib/bookmarks.ts`のcreateBookmark/updateBookmark/deleteBookmarkを利用)
  - 🔵 保存中・削除中は操作ボタンを無効化し、二重操作を防ぐ

- Task 5: 記事詳細ページでの付箋表示切り替え・運営者向けフィードバックのisAdmin化(仕様: requirements.md#トピックへの付箋-1、requirements.md#トピックへの付箋-5、[article-detail/tasks.md](../article-detail/tasks.md)のTask 13と合わせて改修)
  - 🔴 セッションがある場合のみBookmarkPanelが描画されること(未ログインでは付箋の操作が一切表示されないこと)、`TopicSection`に渡した`bookmark`propの内容がBookmarkPanelの`initialBookmark`にそのまま渡ることを確認するテストを書く
  - 🟢 `TopicSection`に`bookmark: { id: string; memo: string } | null`propを追加し、`{session && <BookmarkPanel .../>}`を配置する(フィードバック欄の`isAdmin`対応は[article-detail/tasks.md](../article-detail/tasks.md)Task 13で行う。同じファイルへの変更のため実装順に注意)

- Task 6: 記事詳細ページでの自分の付箋一覧取得(仕様: design.md「記事内の自分の付箋の有無をまとめて取得する処理」)
  - `ArticleDetailView`に、セッション確立後`fetchBookmarksByArticleDate(article.date)`を呼び出し、結果のMapを各`TopicSection`へトピックIDで引き当てて渡す配線を追加する
  - 取得失敗時は空のMap(すべて未付箋)として扱う
  - ページ組み立てのみのためカバレッジ計測対象外(vitest.config.mtsの既存除外設定、article-detail/tasks.mdのTask 11と同じ考え方)。新規テストは追加せず、Task 2・Task 4〜5のユニットテストで担保する

## 付箋一覧ページ

- Task 7: 付箋一覧の1項目(仕様: requirements.md#付箋した記事一覧-11〜13、design.md「付箋一覧からの編集・削除」)
  - 🔴 記事タイトル・トピック見出し・対象トピックへのリンク(`/ai-dev-digest/<date>#<topicId>`)が表示されること、配下のBookmarkPanelに`initialBookmark`が渡り、そこからの編集・削除操作がそのまま機能することを確認するテストを書く
  - 🟢 `app/ai-dev-digest/components/BookmarkListItem.tsx`を実装する(BookmarkPanelを利用)

- Task 8: 付箋一覧ページ本体(仕様: requirements.md#付箋した記事一覧-10・14〜15、design.md「付箋一覧を取得して表示する処理」「状態管理」)
  - 🔴 未ログイン時はログインを促す表示のみで一覧を取得しないこと、ログイン中で0件の場合は「まだ付箋がありません」の案内が表示されること、1件以上の場合は`updated_at`の新しい順でBookmarkListItemが並ぶこと、`topicIndex`に対応するキーが無い付箋は一覧から除外されること、セッション確認中・取得中はローディング表示のみで未ログイン導線・0件表示のどちらも出さないことを確認するテストを書く
  - 🟢 `app/ai-dev-digest/components/BookmarkListView.tsx`を実装する(`fetchAllBookmarks`を利用)

- Task 9: 付箋一覧ページのルーティング(仕様: design.md「関連するファイル」)
  - `app/ai-dev-digest/bookmarks/page.tsx`を実装する(サーバーコンポーネント。`getAllArticles()`と`buildTopicIndex`でトピック索引を組み立て、`BookmarkListView`へpropsで渡す)
  - page.tsx自体はNext.jsのルーティング用ファイルのためカバレッジ計測対象外。新規テストは追加せず、Task 3・Task 8のユニットテストで担保する

## 既存画面の調整

- Task 10: ログイン導線の文言変更・付箋一覧への入口(仕様: requirements.md#画面共通のログイン導線-16、design.md「画面設計」)
  - `LoginStatus.tsx`の未ログイン時ボタン文言を「運営者ログイン」から「ログイン」に変更する
  - ログイン中の表示に、付箋一覧ページ(`/ai-dev-digest/bookmarks`)へのリンクを追加する
  - 既存パターンの複製(表示のみ)のため新規テストは追加しない([TopicSection]のようなロジックを持たないコンポーネントの既存踏襲。LoginStatus.tsxの元コメント参照)

- Task 11: プライバシーポリシーの更新(仕様: requirements.md#依存関係、[specs/legal/requirements.md](../../legal/requirements.md))
  - `app/legal/page.tsx`のプライバシーポリシーに、付箋機能でログインした読者のGoogleアカウントのメールアドレスと、本人が入力したメモ内容を、ログインしたアカウントに紐付けて保存する旨を追記する(life-money-simのマイシナリオ機能の記載パターンを踏襲)
  - コンテンツ変更のみのためテスト対象外
