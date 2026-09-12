# タスク分解: 記事一覧ページ

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: ページ分割ロジック(仕様: requirements.md#ビジネスルール・制約-2)
  - 🔴 21件の記事に対しページ1が新しい順の20件、ページ2が残り1件になること、0件のときは空配列と総ページ数0(または1)になることを確認するテストを書く
  - 🟢 `app/trend-digest/lib/pagination.ts`に`paginate(articles, page, pageSize = 20)`を実装する

- Task 2: カード表示用のトピック見出し選択(仕様: requirements.md#一覧表示-2、requirements.md#ビジネスルール・制約-1)
  - 🔴 トピックが3件以下ならすべて表示され「他N件」が付かないこと、4件以上なら先頭3件+「他N件」になることを確認するテストを書く
  - 🟢 `app/trend-digest/components/ArticleCard.tsx`に表示ロジックを実装する

- Task 3: グループバッジ表示(仕様: requirements.md#一覧表示-2)
  - 🔴 `edition: 'entertainment'`で「エンタメ」、`edition: 'culture-lifestyle'`で「カルチャー」が表示されることを確認するテストを書く
  - 🟢 `app/trend-digest/components/EditionBadge.tsx`を実装する

- Task 4: 記事0件時の表示(仕様: requirements.md#一覧表示-3)
  - 🔴 記事が0件のとき「まだ記事がありません」の案内文が表示されることを確認するテストを書く
  - 🟢 一覧ページ本体(一覧部分を切り出したコンポーネント)に空状態の分岐を実装する

- Task 5: ページネーション表示(仕様: design.md「画面設計」)
  - 🔴 `totalPages`が1以下のとき何も描画されないこと、2以上のとき前へ/次へと現在ページ/総ページ数が表示されることを確認するテストを書く
  - 🟢 `app/trend-digest/components/Pagination.tsx`を実装する

- Task 6: ページ組み立て・メタ情報(仕様: design.md「関連するファイル」、requirements.md#メタ情報-1)
  - `app/trend-digest/page.tsx`(1ページ目)と`app/trend-digest/page/[page]/page.tsx`(2ページ目以降、`generateStaticParams`で総ページ数分列挙)を実装する
  - `app/trend-digest/layout.tsx`にtitle/descriptionを実装する(requirements.md#メタ情報-1)。あわせて[hub-site/requirements.md](../../hub-site/requirements.md)の`/trend-digest`のメタ情報参照が本specを指していることを確認する(既に参照リンクのみのため追加変更は不要)
  - page.tsx自体はNext.jsのルーティング用ファイルのためカバレッジ計測対象外(vitest.config.mtsの既存除外設定に従う)。新規テストは追加せず、Task 1〜5のユニットテストで担保する

## 新規アプリの初回UI・公開画面に伴うタスク

- Task 7: styleguideページ(仕様: `.claude/skills/design/SKILL.md`「UIデザインの確定(Step0)」)
  - `app/trend-digest/styleguide/page.tsx`(新規アプリ初回UIの共通部品一覧。ヘッダー・フッター・EditionBadge・ArticleCard・Pagination等を並べる)
  - `app/trend-digest/styleguide/styleguide.png`(上記のキャプチャ)

- Task 8: トップページへのツールカード追加・sitemap(仕様: `specs/hub-site/requirements.md#機能要件-2`)
  - `app/page.tsx`に`/trend-digest`(週刊トレンド)へのツールカードが表示されることをテストする(`__tests__/page.test.tsx`に追加)。それに合わせて`app/page.tsx`にツールカードを1件追加する(新規アプリの初回公開画面のため)
  - `app/sitemap.ts`に`/trend-digest/`を追加し、`__tests__/sitemap.test.ts`で含まれること・`/trend-digest/styleguide/`は含まれないことをテストする([hub-site/requirements.md#機能要件-5](../../hub-site/requirements.md#機能要件-5))
