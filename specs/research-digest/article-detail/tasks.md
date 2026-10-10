# タスク分解: 記事詳細ページ

> 全13件(Task 1〜Task 13)
> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## データ基盤

- Task 1: `research_digest_feedback`テーブルのマイグレーション(仕様: design.md「データベース設計」)(TDD対象外。SQLの作成のみ)
  - `supabase/migrations/<timestamp>_create_research_digest_feedback.sql`を作る(テーブル・RLS有効化・`authenticated`のINSERT専用ポリシー・`benriyatool_readonly`のSELECTポリシー)
  - アプリコードと同じPRでマージし、`deploy.yml`のmigrateジョブの成功を確認する

- Task 2: 型定義(仕様: design.md「前提: 記事データの形式」)
  - 🔴 `genres.json`の記載順どおりに`GENRE_ORDER`が組み立てられ、`GENRE_LABELS`で日本語ラベルが引けること、`IMPACT_LABELS`が大・中・小を返すこと、`COLLECTION_FAILURE_LABELS`が`timeout`/`invalid-format`/`other`のそれぞれに読者向けの日本語文言(「調査が時間内に終わりませんでした」「調査結果を正しく読み取れませんでした」「調査中にエラーが発生しました」)を返すことを確認するテストを書く
  - 🟢 `app/research-digest/lib/types.ts`に型・`GENRE_ORDER`・`GENRE_LABELS`・`IMPACT_ORDER`・`IMPACT_LABELS`・`COLLECTION_FAILURE_LABELS`を実装する

- Task 3: 記事データのスキーマ検証(仕様: design.md「バリデーション」)
  - 🔴 `parseArticle`について次を確認するテストを書く: 正常な記事(研究9件+掲載できなかったジャンル1件)を受け付ける/研究が0件で掲載できなかったジャンルだけ(全ジャンルが候補なし・収集失敗・生成失敗のいずれか)の記事も受け付ける/同じジャンルが2回現れる場合・`genres.json`にないジャンルの場合に拒否する/`id`が`genre`と一致しない研究を拒否する/必須文字列が空の研究を拒否する/`sourceUrl`が`http(s)`以外なら拒否する/`doi`が`10.`で始まらない文字列なら拒否する(`null`は受け付ける)/`publishedYear`が発行日の年より後なら拒否する/`isPreprint`が真偽値でなければ拒否する/本文が160字未満・480字超なら拒否する/`reason`が定義外なら拒否する/`reason`が`'collection-failed'`で`collectionFailureReason`が欠けている・定義外の値である場合に拒否する/`reason`が`'no-candidate'`・`'generation-failed'`で`collectionFailureReason`を持つ場合に拒否する
  - 🟢 `app/research-digest/lib/articleSchema.ts`に`parseArticle(raw, fileId)`を実装する(本文の分量検証は[content-generation/tasks.md](../content-generation/tasks.md)のTask 1を使う)

- Task 4: 記事データの読み込み(仕様: design.md「記事データを読み込む処理」)
  - 🔴 `getAllArticles`が発行日の新しい順に返すこと、`getArticleById`が存在しないIDで`null`を返すこと、不正なJSONで例外を投げることを確認するテストを書く
  - 🟢 `app/research-digest/lib/articles.ts`に実装する

## 表示ロジック

- Task 5: ジャンル枠の一覧の組み立てと並べ替え(仕様: requirements.md#記事本文の表示-3〜6、requirements.md#並び順の切り替え-8〜9)
  - 🔴 `sortGenres(article, order)`について次を確認するテストを書く: 影響度順で大→中→小、同じ影響度はジャンル順に並ぶ/掲載できなかったジャンルは影響度順では末尾(その中はジャンル順)に並ぶ/ジャンル順では定義順に並び、掲載できなかったジャンルも本来の位置に並ぶ/どちらの並び順でも全ジャンルが含まれる
  - 🟢 `app/research-digest/lib/sortGenres.ts`に実装する

- Task 6: バッジ表示(仕様: requirements.md#記事本文の表示-2、content-selection/requirements.md#採用基準-3)
  - 🔴 ジャンル・影響度が日本語ラベルで表示されること、`isPreprint`が真のときだけ「査読前」のバッジが出ることを確認するテストを書く
  - 🟢 `app/research-digest/components/FindingBadges.tsx`を実装する

- Task 7: 1ジャンル分のカード(仕様: requirements.md#記事本文の表示-2〜5)
  - 🔴 研究があるジャンルで見出し・本文・影響度の根拠・出典(論文名・掲載誌名/発表元・年、新規タブのリンク、`rel="noopener noreferrer"`)が表示されること、`publishedYear`が`null`なら年を出さないこと、`no-candidate`で「候補が見つかりませんでした」、`collection-failed`で`COLLECTION_FAILURE_LABELS`による読者向け日本語ラベル(例:「調査が時間内に終わりませんでした」)を含む「今回は記事を収集できませんでした」(候補なしと異なる文言)、`generation-failed`で「今回は記事を用意できませんでした」が表示されることを確認するテストを書く
  - 🟢 `app/research-digest/components/FindingCard.tsx`を実装する

- Task 8: 並び順の切り替え(仕様: requirements.md#並び順の切り替え-7・10)
  - 🔴 `SortToggle`の選択状態(`aria-pressed`)と`onChange`、`ArticleDetailView`の初期表示が影響度順で「ジャンル順」を押すと並びが変わることを確認するテストを書く
  - 🟢 `SortToggle.tsx`と`ArticleDetailView.tsx`の並び順の状態を実装する

## フィードバック

- Task 9: フィードバックの保存処理(仕様: requirements.md#運営者向けフィードバック-12)
  - 🔴 Supabaseクライアントをモックし、`research_digest_feedback`に`article_id`・`finding_id`・`comment`・`is_test`をINSERTし成否を返すことを確認するテストを書く
  - 🟢 `app/research-digest/lib/saveFeedback.ts`を実装する

- Task 10: フィードバック入力欄(仕様: requirements.md#運営者向けフィードバック-12〜13)
  - 🔴 空・空白のみで送信不可、1000字を超える入力で送信不可、入力欄に`maxLength={1000}`が設定されていること、送信中はボタン無効、成功で入力欄が空になり「送信しました」、失敗で入力が残り失敗文言が出ることを確認するテストを書く
  - 🟢 `app/research-digest/components/FeedbackForm.tsx`を実装する

- Task 11: 運営者判定による出し分け(仕様: requirements.md#運営者向けフィードバック-11、requirements.md#フィードバックの保存・権限-3)
  - 🔴 `isAuthorizedAdmin`をモックし、許可された場合だけ研究があるジャンルにフィードバック入力欄が出ること、未ログイン・許可外・確認失敗では出ないことを確認するテストを書く
  - 🟢 `ArticleDetailView.tsx`にセッション取得・運営者判定・ログイン状態の購読を実装し、`LoginStatus.tsx`をページ下部に置く

## ページ組み立て

- Task 12: 記事詳細ページ(仕様: design.md「画面設計」)
  - `app/research-digest/[id]/page.tsx`を実装する(`generateStaticParams`で全記事IDを列挙し、タイトル・公開日を出して`ArticleDetailView`へ渡す)
  - page.tsxはカバレッジ計測対象外。Task 2〜11のテストで担保する

## 週1回配信を週2回(2編)に分割する追加タスク

`Edition`型・`EDITION_GENRES`の追加と、`id`/記事タイトルの編対応。〔提案〕

<details><summary>詳細を開く</summary>

- Task 13: 型定義・スキーマ検証・読み込みの編対応(仕様: requirements.md#記事本文の表示-1〜2、design.md「前提: 記事データの形式」「バリデーション」)
  - 🔴 Task 2のテストに、`Edition`型(`'body-life'`/`'science-society'`)・`EDITION_LABELS`・`EDITION_GENRES`(genres.jsonのedition属性から編ごとのジャンルID配列を作る)を確認するケースを追加する
  - 🟢 `app/research-digest/lib/types.ts`に`Edition`/`EDITION_LABELS`/`EDITION_GENRES`を追加する
  - 🔴 Task 3の`parseArticle`のテストに、`id`が`<date>-<edition>`形式であること、`edition`が2値のいずれかであること、各研究・各掲載できなかったジャンルの`genre`が`EDITION_GENRES[edition]`に含まれない場合に例外になることを確認するケースを追加する
  - 🟢 `app/research-digest/lib/articleSchema.ts`の`parseArticle`を上記の検証に対応させる
  - 🔴 Task 12の`page.tsx`のテスト(または`generateStaticParams`相当の確認)に、IDが`<date>-<edition>`形式で列挙されることを確認するケースを追加する
  - 🟢 `app/research-digest/[id]/page.tsx`を更新する

</details>

## 固定4観点・図解への移行

〔提案〕

<details><summary>詳細を開く</summary>

- Task 14: 固定4観点の型と表示(仕様: requirements.md#記事本文の表示-14、design.md「前提: 記事データの形式」「その回の記事本文を表示する処理」手順3-1)
  - 🔴 `isLegacyFinding`が`body`を持つ研究で`true`、`sections`を持つ研究で`false`を返すことを確認するテストを書く
  - 🟢 `app/research-digest/lib/types.ts`に`Diagram`/`FindingSection`/`FindingSections`/`SECTION_LABELS`/`LegacyFinding`/`CurrentFinding`/`isLegacyFinding`を追加する
  - 🔴 `isLegacyFinding(finding)`が`true`の場合は`body`がそのまま1段落で表示されること、`false`の場合は`finding`→`basis`→`relevance`→`caveat`の順に`SECTION_LABELS`の固定ラベル→`heading`→`text`が表示されることを確認するテストを書く
  - 🟢 `app/research-digest/components/FindingCard.tsx`を修正し、`isLegacyFinding`で表示を分岐する

- Task 15: 図解の表示(仕様: requirements.md#記事本文の表示-15、design.md「その回の記事本文を表示する処理」手順3-2)
  - 🔴 `diagram`が`null`の場合は何も描画されないこと、`{type:'mermaid'}`の場合はMermaidコンテナが描画されること、`{type:'image'}`の場合は`<img>`の`src`が`path`と一致することを確認するテストを書く(news-digestのDiagramViewテストと同じ内容)
  - 🟢 `app/research-digest/components/DiagramView.tsx`を実装する(news-digestが導入済みの`mermaid`パッケージをそのまま利用)。`FindingCard.tsx`から新形式の各観点の`diagram`を渡して配置する

</details>
