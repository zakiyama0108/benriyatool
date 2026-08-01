# タスク分解: 記事一覧ページ

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- Task 1: ページ分割ロジック(仕様: requirements.md#ビジネスルール・制約-2)
  - 🔴 21件の記事に対しページ1が新しい順の20件、ページ2が残り1件になること、0件のときは空配列と総ページ数0(または1)になることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/pagination.ts`に`paginate(articles, page, pageSize = 20)`を実装する

- Task 2: カード表示用のトピック見出し選択(仕様: requirements.md#一覧表示-2、requirements.md#ビジネスルール・制約-1)
  - 🔴 トピックが3件以下ならすべて表示され「他N件」が付かないこと、4件以上なら先頭3件+「他N件」になることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/components/ArticleCard.tsx`に表示ロジックを実装する

- Task 3: 記事0件時の表示(仕様: requirements.md#一覧表示-3)
  - 🔴 記事が0件のとき「まだ記事がありません」の案内文が表示されることを確認するテストを書く
  - 🟢 一覧ページ本体(一覧部分を切り出したコンポーネント)に空状態の分岐を実装する

- Task 4: ページネーション表示(仕様: design.md「画面設計」)
  - 🔴 `totalPages`が1以下のとき何も描画されないこと、2以上のとき前へ/次へと現在ページ/総ページ数が表示されることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/components/Pagination.tsx`を実装する

- Task 5: ページ組み立て(仕様: design.md「関連するファイル」)
  - `app/ai-dev-digest/page.tsx`(1ページ目)と`app/ai-dev-digest/page/[page]/page.tsx`(2ページ目以降、`generateStaticParams`で総ページ数分列挙)を実装する
  - page.tsx自体はNext.jsのルーティング用ファイルのためカバレッジ計測対象外(vitest.config.mtsの既存除外設定に従う)。新規テストは追加せず、Task 1〜4のユニットテストで担保する
