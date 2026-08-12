# 設計: 記事一覧ページ

## 処理フロー

### 記事一覧をページ分割する処理
- 対象: [article-detail](../article-detail/design.md)の`getAllArticles()`が返す全記事(新しい順)
- 手順:
  1. 全記事を`date`の新しい順に並べる(`getAllArticles()`が既に新しい順を保証する)
  2. 20件ごとに区切り、指定されたページ番号に該当する範囲を取り出す(requirements.md#ビジネスルール・制約-2)
  3. 総ページ数(総記事数を20で割って切り上げ)を算出する
  4. 記事が1件も存在しない場合は、空の一覧と「まだ記事がありません」の表示に必要な情報を返す(requirements.md#一覧表示-3)(具体的な文言)
- 関連するビジネスルール: requirements.md#ビジネスルール・制約-2

### カードに表示するトピック見出し・メリット導入文を選ぶ処理
- 対象: 1記事分の`topics`配列
- 手順:
  1. 配列の先頭から最大3件を、`{ heading, benefitTeaser }`の組でカードに表示する(要件は「数件」とのみ定めており、1〜5件保持するトピックの一部を見せる目的のため3件に設定。件数自体は一覧専用の要約ではなく詳細ページと同じ見出し文字列・導入文をそのまま使う。requirements.md#ビジネスルール・制約-1)
  2. `heading`は詳細ページと同じ`topic.heading`をそのまま使う
  3. `benefitTeaser`は、`isLegacyTopic(topic)`が`false`(2026-08以降生成、`CurrentTopic`)の場合のみ`topic.summary.benefit.teaser`をそのまま使う。`true`(2026-08以前生成、`LegacyTopic`)の場合は`undefined`とする(article-detail/design.md「前提: 記事データの形式」の`isLegacyTopic`型ガードを利用。requirements.md#一覧表示-4)
  4. 記事が保持するトピックが3件を超える場合、カードに「他N件」の表示を添える
- 関連するビジネスルール: requirements.md#一覧表示-2・4、requirements.md#ビジネスルール・制約-1

## 関連するファイル(抜粋)

```
app/ai-dev-digest/lib/articles.ts (既存: article-detailで新規作成するgetAllArticles/getArticleByDateを利用)
app/ai-dev-digest/lib/pagination.ts (新規: paginate(articles, page, pageSize=20))
app/ai-dev-digest/lib/articleTitle.ts (既存: content-generationで新規作成するbuildArticleTitleを利用)
app/ai-dev-digest/components/ArticleCard.tsx (既存。2026-08修正: topicHeadings: string[]をtopics: { heading: string; benefitTeaser?: string }[]に変更し、見出しの下にbenefitTeaserがあれば表示する)
app/ai-dev-digest/components/Pagination.tsx (新規)
app/ai-dev-digest/page.tsx (新規: 一覧ページ1ページ目)
app/ai-dev-digest/page/[page]/page.tsx (新規: 2ページ目以降。generateStaticParamsで総ページ数分を列挙)
```

## エラーハンドリング

- 存在しないページ番号(総ページ数を超える、0以下)が指定された場合は404相当の扱いにする(静的エクスポートのためNext.jsの`notFound()`をビルド時の`generateStaticParams`が生成しない未知パスとして扱い、実際には該当パス自体が生成されないため、Cloudflare Workers側の404ページに委ねる)
- `getAllArticles()`が記事データのスキーマ違反で例外を投げた場合、一覧ページのビルドも失敗する(article-detail/design.md#エラーハンドリングと同じ方針。壊れた記事データのまま一覧だけ正常に見える状態を作らない)

## 画面設計

- 見出し「AI駆動開発ダイジェスト」+簡単な説明文
- カード一覧(新しい順、1ページ20件): 記事タイトル(`buildArticleTitle(date)`)・公開日・トピック見出し(最大3件、超過時は「他N件」)・(2026-08以降生成のトピックのみ)見出しの下に🚀メリット観点の導入文を1行程度で併記・詳細ページへのリンク
- 記事が0件の場合: 「まだ記事がありません。しばらくお待ちください。」という案内文のみを表示する
- ページ下部にページネーション(前へ/次へ、および現在ページ/総ページ数の表示)。1ページのみの場合はページネーションを表示しない

## コンポーネント設計

| コンポーネント | Props | 役割 |
|---|---|---|
| ArticleCard | `date: string`, `topics: { heading: string; benefitTeaser?: string }[]`, `totalTopicCount: number` | 1記事分のカード表示(2026-08修正: `topicHeadings: string[]`から変更し、見出しの下に🚀メリット観点の導入文を併記できるようにした) |
| Pagination | `currentPage: number`, `totalPages: number` | 前へ/次へ・現在ページ表示。`totalPages <= 1`なら何も描画しない |

## セキュリティ

`article-detail/design.md#セキュリティ`と同じ前提(記事データは開発者・エージェントが作成するコンテンツで訪問者入力ではない)。本specはフィードバック機能を持たず、追加のリスクはない。

## ログ

一覧ページの表示・ページ分割は静的生成された結果を返すだけの処理であり、実行時に出力すべきログはない(ビルド時のエラーはarticle-detail/design.md#エラーハンドリングのビルド失敗としてCIログに現れる)。
