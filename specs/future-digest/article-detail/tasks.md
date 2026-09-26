# タスク分解: 記事詳細ページ

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## データ基盤

- Task 1: `future_digest_feedback`テーブルのマイグレーション(仕様: design.md「データベース設計」)(TDD対象外。SQLの作成のみ)
  - `supabase/migrations/<timestamp>_create_future_digest_feedback.sql`を作成する(テーブル作成+RLS有効化+`authenticated`のINSERT専用ポリシー+`benriyatool_readonly`のSELECTポリシー)
  - アプリコードと同じPRでレビュー・マージし、`deploy.yml`のmigrateジョブの成功を確認する

- Task 2: 型定義と時間軸の導出(仕様: design.md「前提: 記事データの形式」、content-selection/requirements.md#時間軸の切り替え-1)
  - 🔴 `horizonsForIssue(1)`・`horizonsForIssue(3)`が`['near','long']`、`horizonsForIssue(2)`・`horizonsForIssue(4)`が`['mid','ultra-long']`を返すこと、0以下では例外になることを確認するテストを書く
  - 🔴 `genres.json`の記載順どおりに`GENRE_ORDER`が組み立てられ、`GENRE_LABELS`で日本語ラベルが引けることを確認するテストを書く
  - 🟢 `app/future-digest/lib/types.ts`に型・`GENRE_ORDER`・`GENRE_LABELS`(genres.jsonから組み立て)・`HORIZON_ORDER`・`HORIZON_LABELS`・`IMPACT_ORDER`・`IMPACT_LABELS`・`horizonsForIssue`を実装する

- Task 3: 記事データのスキーマ検証(仕様: design.md「バリデーション」)
  - 🔴 `parseArticle`について次を確認するテストを書く: 正常な記事(予測18件+掲載できなかった枠2件)を受け付ける/記事に現れるジャンルでその回の2時間軸の片方が欠けている場合・同じ枠が重複する場合・`genres.json`にないジャンルの場合に拒否する/その回の時間軸以外の`horizon`を拒否する/`id`が`<genre>--<horizon>`と一致しない予測を拒否する/必須文字列が空の予測を拒否する/`sourceUrl`が`http(s)`以外なら拒否する/本文が160字未満・480字超なら拒否する/予測が0件の記事を拒否する/`issueNumber`が1未満なら拒否する/`reason`が定義外なら拒否する
  - 🟢 `app/future-digest/lib/articleSchema.ts`に`parseArticle(raw, fileId)`を実装する(本文の分量検証は[content-generation/tasks.md](../content-generation/tasks.md)のTask 1の`isValidBodyLength`を使う)

- Task 4: 記事データの読み込み(仕様: design.md「記事データを読み込む処理」)
  - 🔴 一時ディレクトリの記事JSONから、`getAllArticles`が発行日の新しい順に返すこと、`getArticleById`が存在しないIDで`null`を返すこと、不正なJSONで例外を投げることを確認するテストを書く
  - 🟢 `app/future-digest/lib/articles.ts`に`getAllArticles`/`getArticleById`を実装する

## 表示ロジック

- Task 5: 枠の一覧の組み立てと並べ替え(仕様: requirements.md#記事本文の表示-3〜6、requirements.md#並び順の切り替え-8〜9、design.md「表示する枠の一覧を組み立てる処理」)
  - 🔴 `sortSlots(article, order)`について次を確認するテストを書く: 影響度順で大→中→小に並ぶ/同じ影響度の中ではジャンル順→時間軸の近い順に並ぶ/候補が見つからなかった枠・収集に失敗した枠・生成に失敗した記事は影響度順では末尾(その中はジャンル順)に並ぶ/ジャンル順ではジャンルの定義順→時間軸の近い順に並び、それらの枠も本来の位置に並ぶ/どちらの並び順でも全枠(有効なジャンル数×2時間軸。現在は20枠)が含まれる
  - 🟢 `app/future-digest/lib/sortSlots.ts`に実装する

- Task 6: バッジ表示(仕様: requirements.md#記事本文の表示-2)
  - 🔴 ジャンル・時間軸・影響度が日本語ラベル(例:「テクノロジー・AI」「近未来」「影響度 大」)で表示されること、`impact`がないときは影響度バッジを出さないことを確認するテストを書く
  - 🟢 `app/future-digest/components/SlotBadges.tsx`を実装する

- Task 7: 1枠分のカード(仕様: requirements.md#記事本文の表示-2〜3、design.md「その回の記事本文を表示する処理」手順3〜4)
  - 🔴 予測がある枠で見出し・本文・影響度の根拠・対象時期・出典リンク(新規タブ、`rel="noopener noreferrer"`)が表示されること、`no-candidate`の枠で「候補が見つかりませんでした」、`generation-failed`の枠で「今回は記事を用意できませんでした」が表示され本文・フィードバック欄が出ないことを確認するテストを書く
  - 🟢 `app/future-digest/components/PredictionCard.tsx`を実装する

- Task 8: 並び順の切り替え(仕様: requirements.md#並び順の切り替え-7・10)
  - 🔴 `SortToggle`で選択中の並び順が分かる表示(`aria-pressed`)になること、押すと`onChange`が呼ばれることを確認するテストを書く。`ArticleDetailView`で初期表示が影響度順であり、「ジャンル順」を押すとカードの並びがジャンル順に変わることを確認するテストを書く
  - 🟢 `app/future-digest/components/SortToggle.tsx`と、`ArticleDetailView.tsx`の並び順の状態を実装する

## フィードバック

- Task 9: フィードバックの保存処理(仕様: requirements.md#運営者向けフィードバック-9、design.md「フィードバックを送信する処理」)
  - 🔴 Supabaseクライアントをモックし、`saveFeedback`が`future_digest_feedback`に`article_id`・`prediction_id`・`comment`・`is_test`をINSERTし、成功/失敗を返すことを確認するテストを書く
  - 🟢 `app/future-digest/lib/saveFeedback.ts`を実装する(trend-digestの`saveFeedback.ts`と同じ構成)

- Task 10: フィードバック入力欄(仕様: requirements.md#運営者向けフィードバック-12〜13)
  - 🔴 空・空白のみでは送信ボタンが無効になること、送信中はボタンが無効になること、成功で入力欄が空になり「送信しました」が出ること、失敗で入力内容が残り失敗文言が出ることを確認するテストを書く
  - 🟢 `app/future-digest/components/FeedbackForm.tsx`を実装する

- Task 11: 運営者判定による出し分け(仕様: requirements.md#運営者向けフィードバック-11、requirements.md#フィードバックの保存・権限-3)
  - 🔴 `isAuthorizedAdmin`をモックし、許可された場合だけ予測がある枠にフィードバック入力欄が出ること、未ログイン・許可外・確認失敗では出ないことを確認するテストを書く
  - 🟢 `ArticleDetailView.tsx`にセッション取得・`isAuthorizedAdmin`・`onAuthChange`の購読を実装し、`LoginStatus.tsx`をページ下部に置く

## ページ組み立て

- Task 12: 記事詳細ページ(仕様: design.md「関連するファイル」「画面設計」)
  - `app/future-digest/[id]/page.tsx`を実装する(`generateStaticParams`で全記事IDを列挙し、記事タイトル・公開日・時間軸2区分を見出しに出して`ArticleDetailView`へ渡す)
  - page.tsxはカバレッジ計測対象外。Task 2〜11のテストで担保する
