# タスク分解: 情報源一覧(運営者専用・5アプリ共通)

> 全10件(Task 1〜Task 10)
> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## 共通の型

### Task 1: SourceDirectoryRow型を定義する(仕様: design.md#処理フロー「アプリごとの表示行を組み立てる処理」)

5アプリ共通の表示行の型を定義する。TDD対象外(型定義のみ)。

<details><summary>詳細を開く</summary>

- 🟢 `app/blog/lib/sourceDirectory/types.ts`に`SourceDirectoryRow`型(`genreLabel`/`editionLabel?`/`methodLabel`/`criteriaText`/`sources: Array<{name,url,regionLabel?}>`/`searchHints: string[]`)を定義する

</details>

## アプリごとの変換関数

### Task 2: ai-dev-digestの表示行を組み立てる(仕様: requirements.md#ジャンルごとの情報源・採用基準の表、design.md#処理フロー)

`watchlist.json`/`criteria.json`から5グループ(公式組織/個人YouTube/個人ブログ/Qiita/Zenn)の表示行を作る。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/lib/sourceDirectory/buildAiDevDigestSources.test.ts`に、5グループの行が生成されること・各グループの採用基準の文言・情報源の名前とURLが正しいことを確認するテストを書く
- 🟢 `app/blog/lib/sourceDirectory/buildAiDevDigestSources.ts`に実装する。`category`で公式組織/個人YouTube/個人ブログを分け、`category: 'platform'`はid(`qiita`/`zenn`)でさらに分ける

</details>

### Task 3: news-digestの表示行を組み立てる(仕様: requirements.md#ジャンルごとの情報源・採用基準の表、design.md#処理フロー)

`watchlist.json`/`criteria.json`から4カテゴリの表示行を作る。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/lib/sourceDirectory/buildNewsDigestSources.test.ts`に、4カテゴリの行が生成されること・採用基準の文言(2社以上の同時報道/専用枠)が正しいことを確認するテストを書く
- 🟢 `app/blog/lib/sourceDirectory/buildNewsDigestSources.ts`に実装する

</details>

### Task 4: trend-digestの表示行を組み立てる(仕様: design.md#決定事項「trend-digestの表示行の組み立て」)

既存の`buildSourceDirectory`をラップするだけの薄い変換関数を作る。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/lib/sourceDirectory/buildTrendDigestSources.test.ts`に、既存の`watchlist.json`/`criteria.json`を渡した結果が共通の`SourceDirectoryRow`型に変換されることを確認するテストを書く
- 🟢 `app/blog/lib/sourceDirectory/buildTrendDigestSources.ts`に実装する。`app/trend-digest/lib/buildSourceDirectory.ts`をimportし、結果をそのまま(または型をそのまま共用して)返す

</details>

### Task 5: future-digestの表示行を組み立てる(仕様: design.md#決定事項「future-digest/research-digestの選定方式・採用基準の表示」)

`genres.json`の有効なジャンルから、選定方式「WebSearch」固定・採用基準の固定文言で表示行を作る。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/lib/sourceDirectory/buildFutureDigestSources.test.ts`に、`active: true`のジャンルのみ行になること・個人的注目分野ジャンルは`themes`が検索の手がかりに入ることを確認するテストを書く
- 🟢 `app/blog/lib/sourceDirectory/buildFutureDigestSources.ts`に実装する。`app/future-digest/lib/genres.ts`の`loadGenres`/`getActiveGenres`を使う

</details>

### Task 6: research-digestの表示行を組み立てる(仕様: design.md#決定事項「future-digest/research-digestの選定方式・採用基準の表示」)

future-digestと同じ方針でresearch-digest用の変換関数を作る。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/lib/sourceDirectory/buildResearchDigestSources.test.ts`に、`active: true`のジャンルのみ行になることを確認するテストを書く
- 🟢 `app/blog/lib/sourceDirectory/buildResearchDigestSources.ts`に実装する。`app/research-digest/lib/genres.ts`を使う

</details>

## 画面

### Task 7: SourceTableコンポーネントを汎用化する(仕様: requirements.md#ジャンルごとの情報源・採用基準の表)

既存のtrend-digest単体実装のSourceTableを、編列の有無を切り替えられるよう汎用化する。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/admin/sources/components/SourceTable.test.tsx`に、行に`editionLabel`が1件もない場合は編列自体が表示されないこと・ある場合は表示されることを確認するテストを書く(既存のtrend-digest単体実装のテストを移植・拡張する)
- 🟢 `app/blog/admin/sources/components/SourceTable.tsx`に実装する(`app/trend-digest/admin/sources/components/SourceTable.tsx`を元に汎用化する)

</details>

### Task 8: SourceTabsコンポーネントを実装する(仕様: requirements.md#アプリ切り替えタブ)

5アプリのタブを表示し、選択を通知する。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/admin/sources/components/SourceTabs.test.tsx`に、`DIGEST_APPS`の順でタブが表示されること・クリックで`onSelect`が呼ばれることを確認するテストを書く
- 🟢 `app/blog/admin/sources/components/SourceTabs.tsx`に実装する

</details>

### Task 9: /blog/admin/sourcesページを実装する(仕様: requirements.md#アプリ切り替えタブ、#閲覧できる人)

ログイン判定→タブ切り替え→表の表示までを1画面に実装する。

<details><summary>詳細を開く</summary>

- 🔴 `__tests__/blog/admin/sources/page.test.tsx`に、未ログイン時はログイン画面が表示されること・許可対象外は閲覧不可の表示になること・許可対象は初期表示がai-dev-digestの表になること・タブ切り替えで表示アプリが変わることを確認するテストを書く(既存のtrend-digest単体実装のテストを移植・拡張する)
- 🟢 `app/blog/admin/sources/page.tsx`に実装する。`app/lib/adminAuth.ts`でログイン判定し、Task 2〜6の変換関数の結果をTask 8のタブ・Task 7の表に渡す

</details>

## 既存実装の統合

### Task 10: trend-digest単体のadmin/sourcesページを削除する(仕様: specs/trend-digest/architecture.md)

Task 9で`/blog/admin/sources`に統合した後、重複するtrend-digest単体のページを削除する。

<details><summary>詳細を開く</summary>

- 🔵 `app/trend-digest/admin/sources/`・対応する`__tests__/trend-digest/admin/sources/`を削除する
- 🟢 `npm test`・`npm run lint`・`npm run build`を実行し、削除後も壊れていないことを確認する(`app/**/admin/**`除外ルールにより`/blog/admin/sources`もsitemapの対象外であることを合わせて確認する)

</details>
