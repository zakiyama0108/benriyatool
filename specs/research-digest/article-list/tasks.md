# タスク分解: 記事一覧ページ

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: ページ分け(仕様: requirements.md#ビジネスルール・制約-2、design.md「記事一覧をページ分けする処理」)
  - 🔴 21件でページ1が新しい順の20件・ページ2が1件になること、0件で空配列・総ページ数0になることを確認するテストを書く
  - 🟢 `app/research-digest/lib/pagination.ts`に`paginate(articles, page, pageSize = 20)`を実装する

- Task 2: 各回に載せる見出しの選択(仕様: requirements.md#一覧表示-2〜3、design.md「各回に載せる見出しを選ぶ処理」)
  - 🔴 `selectCardHeadings(article)`について次を確認するテストを書く: 「大」が4件以上ならジャンル順で先頭3件の「大」だけが選ばれる/「大」が1件なら「大」1件+「中」2件になる/「大」が0件なら「中」「小」から3件になる/研究が2件なら2件だけ返る/掲載できなかったジャンルは選ばれない/各見出しに影響度が付く
  - 🟢 `app/research-digest/lib/selectCardHeadings.ts`に実装する

- Task 3: 1回分のカード(仕様: requirements.md#一覧表示-2)
  - 🔴 公開日・記事タイトル・見出しと影響度のバッジ(査読前の論文は「査読前」のバッジも)・詳細ページへのリンク(`/research-digest/<id>`)が表示されることを確認するテストを書く
  - 🟢 `app/research-digest/components/ArticleCard.tsx`を実装する

- Task 4: 一覧本体と0件時の表示(仕様: requirements.md#一覧表示-1・4)
  - 🔴 記事が新しい順に並ぶこと、0件のとき「まだ記事がありません」の案内だけが表示されることを確認するテストを書く
  - 🟢 `app/research-digest/components/ArticleListView.tsx`を実装する

- Task 5: ページ送り(仕様: design.md「画面設計」)
  - 🔴 `totalPages`が1以下で何も描画されないこと、2以上で前へ/次へと現在ページ/総ページ数が表示されること、1ページ目の前へ・最終ページの次へが出ないことを確認するテストを書く
  - 🟢 `app/research-digest/components/Pagination.tsx`を実装する

- Task 6: ページ組み立て・メタ情報(仕様: requirements.md#メタ情報-5)
  - `app/research-digest/page.tsx`・`app/research-digest/page/[page]/page.tsx`(`generateStaticParams`で2ページ目以降を列挙)を実装する
  - `app/research-digest/layout.tsx`にtitle「週刊研究発見｜暮らしに影響する研究・論文を毎週お届け」・requirements.md#メタ情報-5のdescriptionを設定する
  - page.tsx・layout.tsxはカバレッジ計測対象外。Task 1〜5のテストで担保する

## 新規アプリの初回UI・公開画面に伴うタスク

- Task 7: styleguideページ(仕様: [article-detail/design.md](../article-detail/design.md)「画面設計」。Step0は実施しない(D4。trend-digestの確定済みデザインを流用))
  - `app/research-digest/styleguide/page.tsx`(ヘッダー・フッター・FindingBadges・ArticleCard・FindingCardの各状態(研究あり/査読前/候補なし/収集失敗/生成失敗)・SortToggle・Pagination・BookmarkPanelを並べる)と、そのキャプチャ`styleguide.png`を作る

- Task 8: トップページへのツールカード追加・sitemap・hub-siteの仕様(仕様: `specs/hub-site/requirements.md`)
  - 🔴 `__tests__/page.test.tsx`に、トップページに`/research-digest`(週刊研究発見)へのツールカードが表示されることを追加する。`__tests__/sitemap.test.ts`に、`/research-digest/`と各記事ページが含まれ、`/research-digest/styleguide/`・`/research-digest/bookmarks/`が含まれないことを追加する
  - 🟢 `app/page.tsx`にツールカードを1件、`app/sitemap.ts`に一覧・記事・2ページ目以降を追加する
  - `specs/hub-site/requirements.md`のメタ情報・ファビコン・sitemap除外の各項目に`/research-digest`を追記する(ファビコンはティール系背景+フラスコ・虫めがねなど研究を表すモチーフ)

- Task 9: ファビコン(仕様: `specs/hub-site/requirements.md`のファビコンの項目)
  - `app/research-digest/icon.svg`を追加する
