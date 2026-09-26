# タスク分解: 付箋(記事の個人メモ・ブックマーク)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## データ基盤

- Task 1: `research_digest_bookmarks`テーブルのマイグレーション(仕様: design.md「データベース設計」)(TDD対象外。SQLの作成のみ)
  - `supabase/migrations/<timestamp>_create_research_digest_bookmarks.sql`を作る(テーブル・本人行のみのRLS4本・一意制約・CHECK制約・`benriyatool_readonly`のSELECT)
  - アプリコードと同じPRでマージし、`deploy.yml`のmigrateジョブの成功を確認する
  - design.md「データベース設計」の実機確認5項目は、2つのGoogleアカウントを使う手動確認とし、実装PRの動作確認欄に実施状況を書く

## 付箋の読み書き

- Task 2: 付箋の取得・作成・更新・削除(仕様: requirements.md#記事への付箋-1〜4、requirements.md#付箋の編集・削除-7〜8、requirements.md#付箋の一覧-13)
  - 🔴 Supabaseクライアントをモックし、`fetchBookmarksByArticle`が記事IDで絞り込み研究IDで引けるMapを返すこと、`fetchAllBookmarks`が`updated_at`の新しい順で返すこと、`createBookmark`/`updateBookmark`(`updated_at`も更新)/`deleteBookmark`が正しいカラム・IDで呼ばれ成否を返すことを確認するテストを書く
  - 🟢 `app/research-digest/lib/bookmarks.ts`に実装する(news-digestの`bookmarks.ts`と同じ関数構成)

- Task 3: 研究の索引(仕様: requirements.md#付箋の一覧-10)
  - 🔴 全記事から「記事ID:研究ID」→見出し・ジャンルの索引が作られ、掲載できなかったジャンルは含まれないことを確認するテストを書く
  - 🟢 `app/research-digest/lib/findingIndex.ts`に`buildFindingIndex(articles)`を実装する

## 画面部品

- Task 4: 付箋パネル(仕様: requirements.md#記事への付箋-1〜6、requirements.md#付箋の編集・削除-7〜8)
  - 🔴 未付箋で「付箋を貼る」だけが出ること、押すとその場に入力欄が開くこと、空・空白のみ・200文字超で保存ボタンが無効になること、保存の成功で「付箋あり」になること、失敗で入力内容が残り失敗文言が出ること、付箋ありで「編集」「削除」が出ること、削除の成功で「未付箋」に戻ること、処理中はボタンが無効になることを確認するテストを書く
  - 🟢 `app/research-digest/components/BookmarkPanel.tsx`を実装する(news-digestと同じ実装)

- Task 5: 記事詳細ページへの配線(仕様: requirements.md#記事への付箋-5、design.md「記事内の自分の付箋をまとめて取得する処理」)
  - 🔴 ログイン中だけ研究があるジャンルに`BookmarkPanel`が出ること、候補なし・生成失敗のジャンルには出ないこと、取得した付箋が研究IDで引き当てられて渡ること、取得失敗時は全て未付箋になること、各カードに研究IDの`id`属性が付くことを確認するテストを書く
  - 🟢 `ArticleDetailView.tsx`・`FindingCard.tsx`に配線する([article-detail/tasks.md](../article-detail/tasks.md)のTask 7・11と同じファイルを変更するため、その後に行う)

- Task 6: 付箋一覧の1項目(仕様: requirements.md#付箋の一覧-10〜12)
  - 🔴 見出し(`/research-digest/<記事ID>#<研究ID>`へのリンク)・ジャンルのバッジ・メモが表示され、配下の`BookmarkPanel`で編集・削除がその場でできることを確認するテストを書く
  - 🟢 `app/research-digest/components/BookmarkListItem.tsx`を実装する

- Task 7: 付箋一覧の本体(仕様: requirements.md#付箋の一覧-9・13〜14、design.md「付箋一覧を表示する処理」)
  - 🔴 確認中・取得中はローディングだけ、未ログインはログイン導線だけ、0件で「まだ付箋がありません」、1件以上で最後に編集した日時の新しい順に並ぶこと、索引にない付箋が除かれること、削除した項目が一覧から消えることを確認するテストを書く
  - 🟢 `app/research-digest/components/BookmarkListView.tsx`を実装する

- Task 8: ログイン状態表示の付箋一覧リンク(仕様: requirements.md#付箋の一覧-9)
  - 🔴 未ログインで「ログイン」だけ、ログイン中でメールアドレス・「付箋一覧」リンク(`/research-digest/bookmarks`)・ログアウトが出ることを確認するテストを書く
  - 🟢 `app/research-digest/components/LoginStatus.tsx`を実装する

## ページ組み立て・規約

- Task 9: 付箋一覧ページ(仕様: design.md「画面設計」「セキュリティ」)
  - `app/research-digest/bookmarks/page.tsx`を実装する(`getAllArticles()`から索引を作り`BookmarkListView`へ渡す。メタ情報で`robots: noindex`を指定する)
  - page.tsxはカバレッジ計測対象外。Task 2〜8のテストで担保する

- Task 10: プライバシーポリシーの更新(仕様: requirements.md#依存関係)(TDD対象外。静的な文言の追記)
  - `app/legal/page.tsx`のプライバシーポリシーの付箋メモの記載に、週刊研究発見を加える(news-digest・ai-dev-digestの記載パターンに合わせる)。`specs/legal/requirements.md`の仕様リンクに本specを追加する
