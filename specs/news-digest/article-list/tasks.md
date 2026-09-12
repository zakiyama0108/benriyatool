# タスク分解: 記事一覧ページ

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

> 補足: 本アプリの初回UIだがStep0(Stitchでの新規UIデザイン確定)は実施していない(/consultの決定によりai-dev-digestの実装済みデザインをそのまま流用するため。[architecture-workflow](../../../.claude/skills/architecture-workflow/SKILL.md)/[design](../../../.claude/skills/design/SKILL.md)が定める「Step0を実施した回」のstyleguideページ作成タスクは、この回では対象外とする)。

- Task 1: 記事一覧のページ分割(仕様: requirements.md#ビジネスルール・制約-2、design.md「記事一覧をページ分割する処理」)
  - 🔴 20件ごとに区切られること、指定ページの範囲が正しく取り出されること、総ページ数が正しく算出されること、記事が0件の場合は空の一覧を返すことを確認するテストを書く
  - 🟢 `app/news-digest/lib/pagination.ts`に`paginate(articles, page, pageSize=20)`を実装する

- Task 2: カードに表示するトピック見出し・導入文を選ぶ処理(仕様: requirements.md#一覧表示-2・4〜5、design.md「カードに表示するトピック見出し・導入文を選ぶ処理」)
  - 🔴 先頭から最大3件が`{ heading, category, whatHappenedTeaser }`の組で返ること、3件を超える場合は残数が算出されることを確認するテストを書く
  - 🟢 `app/news-digest/components/ArticleCard.tsx`内、またはlib関数として実装する

- Task 3: 記事カード表示(仕様: requirements.md#一覧表示-1〜2・4〜5)
  - 🔴 記事タイトル・公開日・トピック見出し(最大3件)・各見出し下の「何が起きたか」導入文・カテゴリバッジ・詳細ページへのリンクが表示されること、3件を超える場合は「他N件」が表示されることを確認するテストを書く
  - 🟢 `app/news-digest/components/ArticleCard.tsx`を実装する(ai-dev-digestのArticleCard.tsxと同じ構造)

- Task 4: ページネーション表示(仕様: design.md「画面設計」)
  - 🔴 `totalPages <= 1`のとき何も描画されないこと、`currentPage`に応じて「前へ」「次へ」の表示が切り替わることを確認するテストを書く
  - 🟢 `app/news-digest/components/Pagination.tsx`を実装する(ai-dev-digestのPagination.tsxと同一の実装、リンク先のみ`/news-digest`に変更)

- Task 5: 記事一覧ページの組み立て(仕様: requirements.md#一覧表示-1〜3、requirements.md#メタ情報-1)
  - `app/news-digest/page.tsx`(1ページ目)・`app/news-digest/page/[page]/page.tsx`(2ページ目以降、`generateStaticParams`で総ページ数分を列挙)を実装する
  - `metadata`にrequirements.md#メタ情報-1のtitle・descriptionを設定する
  - 記事が1件もない場合は「まだ記事がありません。しばらくお待ちください。」を表示する
  - page.tsx自体はカバレッジ計測対象外。新規テストは追加せずTask 1〜4のユニットテストで担保する

- Task 6: トップページへのツールカード追加(仕様: [specs/hub-site/requirements.md](../../hub-site/requirements.md))
  - `app/page.tsx`に「重要ニュースダイジェスト」のツールカードを追加する(URL: `/news-digest`、概要はREADME.mdのアプリ一覧と同じ文言)
  - TDD対象外(既存ページへの静的な追記のため)
