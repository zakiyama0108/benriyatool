# タスク分解: ブログダイジェストハブページ

> 全6件(Task 1〜Task 6)
> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## データ定義

### Task 1: 5アプリの定数(DIGEST_APPS)を定義する(仕様: requirements.md#ダイジェストカード一覧-1〜4)

5アプリの名称・1行概要・配信曜日ラベル・リンク先・アイコンを持つ定数を作る。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/lib/digestApps.test.ts`に、`DIGEST_APPS`の件数が5件であること・記載順がai-dev-digest→news-digest→trend-digest→future-digest→research-digestであること・各要素が`id`/`name`/`description`/`scheduleLabel`/`href`/`icon`を持つことを確認するテストを書く
- 🟢 `app/blog/lib/digestApps.ts`に型`DigestApp`と定数`DIGEST_APPS`を実装する。`scheduleLabel`は「毎日」「毎週水曜」「火・金(週2回)」「毎週木曜」「毎週月曜」をそれぞれ設定する(design.md決定事項「配信曜日・1行概要の持ち方」)
- 🔵 各アプリの1行概要は`app/page.tsx`(トップページ)が現在使っている文言をそのまま流用する(requirements.md#カードの表示内容の出所-1)

</details>

## 画面

### Task 2: DigestAppCardコンポーネントを実装する(仕様: design.md#コンポーネント設計)

1件分のカード(アイコン・名称・概要・配信曜日)を描画するコンポーネントを作る。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/components/DigestAppCard.test.tsx`に、propsで渡した名称・概要・配信曜日ラベルが表示されること、カード全体がリンク(`href`)になっていることを確認するテストを書く
- 🟢 `app/blog/components/DigestAppCard.tsx`に実装する。見た目はトップページの既存カード(`app/page.tsx`の`<Link>`構造)と同じクラス構成にする

</details>

### Task 3: /blogページを実装する(仕様: requirements.md#ダイジェストカード一覧、#情報源一覧への導線)

`DIGEST_APPS`の順にカードを並べ、下に情報源一覧への導線リンクを置く。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/page.test.tsx`に、5枚のカードが記載順で表示されること・各カードのリンク先が各アプリのトップページであること・情報源一覧ページへのテキストリンクが1つだけ存在することを確認するテストを書く
- 🟢 `app/blog/page.tsx`に実装する。`DIGEST_APPS`をmapしてTask 2の`DigestAppCard`を並べ、最後に`/blog/admin/sources`への`<Link>`を1つ置く

</details>

### Task 4: /blogのメタ情報を設定する(仕様: requirements.md#メタ情報-1)

title/descriptionを設定する。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/page.test.tsx`に、`metadata.title`/`metadata.description`がrequirements.md#メタ情報-1の文言と一致することを確認するテストを追加する
- 🟢 `app/blog/page.tsx`の`export const metadata`に設定する

</details>

## トップページの更新

### Task 5: トップページ(`/`)の5アプリ個別カードを/blogへの1枚のカードに置き換える(仕様: specs/hub-site/requirements.md#機能要件-2)

`app/page.tsx`からai-dev-digest/news-digest/trend-digest/future-digest/research-digestの5カードを削除し、`/blog`への1枚のカードを追加する。

<details><summary>詳細を開く</summary>

- 🔴 既存の`__tests__/page.test.tsx`(あれば)を更新し、上記5アプリ個別リンクが存在しないこと・`/blog`へのリンクが1つ存在することを確認するテストにする
- 🟢 `app/page.tsx`を編集する。アイコンは既存の5アプリカードで使っていた絵文字を踏襲しない(5アプリ入口であることを示す1つのアイコンにする)【推測】

</details>

## 確認

### Task 6: 動作確認(sitemap・既存テストへの影響)

sitemap.tsが`/blog`を自動的に含むこと、既存テストが壊れていないことを確認する。

<details><summary>詳細を開く</summary>

- 🟢 `npm test`・`npm run lint`・`npm run build`を実行し、`app/sitemap.ts`が手動変更なしに`/blog`を列挙することを確認する(`app/**/admin/**`除外ルールの対象外であることも合わせて確認する)

</details>
