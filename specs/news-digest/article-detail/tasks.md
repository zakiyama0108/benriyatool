# タスク分解: 記事詳細ページ

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## データ基盤

- Task 1: `news_digest_feedback`テーブルのマイグレーション(design.md「データベース設計」のSQL、適用基盤: docs/adr/0003)
  - `supabase/migrations/<timestamp>_create_news_digest_feedback.sql`を作成する(テーブル作成+authenticated INSERT専用ポリシー+benriyatool_readonly SELECT専用ポリシー。ai-dev-digestが2026-08-05に修正した最終形を最初から適用する)
  - マイグレーションファイル単独のPRとしてマージし、`deploy.yml`のmigrateジョブが成功したことを確認する
  - 以降のタスク(フィードバック保存の実装・動作確認)より前に適用が完了していることを確認する

- Task 2: 記事データの型定義(仕様: design.md「前提: 記事データの形式」)
  - 🔴 型自体はテスト対象外のため、Task 3のバリデーションテストから間接的に検証する
  - 🟢 `app/news-digest/lib/types.ts`に`Category`/`SummaryPerspective`/`TopicSummary`/`Importance`/`Topic`/`Article`を定義する

- Task 3: 記事データのバリデーション(仕様: design.md「バリデーション」)
  - 🔴 正常な記事データ(1件のみ・7件のケースを含む)が検証を通ること、`topics`が0件/8件で失敗すること、`category`が未定義値で失敗すること、`belowCriteria: true`かつ`belowCriteriaReason`欠落で失敗すること、`date`とファイル名不一致で失敗すること、`summary`の4キーのいずれかが欠落・`heading`/`teaser`/`detail`が空文字で失敗すること、`teaser`が40〜140字の範囲外で失敗すること、`detail`合計文字数が800〜1700字の範囲外で失敗すること、`importance`が1〜5の整数でない場合に失敗することを確認するテストを書く
  - 🟢 `app/news-digest/lib/articleSchema.ts`に`parseArticle(raw: unknown, filename: string): Article`を実装する(違反時は例外を投げる)
  - 🔵 エラーメッセージに違反内容(どのフィールドか)を含めて分かりやすくする

- Task 4: 記事データの読み込み(仕様: requirements.md#記事本文表示-1〜2)
  - 🔴 フィクスチャ用ディレクトリ(`__tests__`配下にテスト用JSONを配置)を対象に、`getArticleByDate`が該当日を返すこと・存在しない日は`null`を返すこと・不正なJSONを含むディレクトリでは例外が伝播することを確認するテストを書く
  - 🟢 `app/news-digest/lib/articles.ts`に`getAllArticles(dir?)`/`getArticleByDate(date, dir?)`を実装する(`dir`省略時は`content/news-digest/articles/`)

## 記事表示

- Task 5: カテゴリバッジ(仕様: requirements.md#記事本文表示-5)
  - 🔴 各`Category`(総合/経済・ビジネス/神奈川ローカル/育児)に対応する日本語ラベルが表示されることを確認するテストを書く
  - 🟢 `app/news-digest/components/CategoryBadge.tsx`を実装する(ai-dev-digestのSourceBadge.tsxと同じ構造)

- Task 6: 重要度表示コンポーネント(仕様: requirements.md#記事本文表示-7、design.md「コンポーネント設計」)
  - 🔴 `importance`の値(1〜5)に応じて塗りつぶし★の数が変わることを確認するテストを書く
  - 🟢 `app/news-digest/components/ImportanceStars.tsx`を実装する(ai-dev-digestのImportanceStars.tsxと同一の実装)

- Task 7: トピック表示(見出し・固定4観点要約・出典・専用枠バッジ)(仕様: requirements.md#記事本文表示-1〜7)
  - 🔴 見出し・カテゴリバッジ・重要度が表示されること、固定4観点(`whatHappened`→`whyItMatters`→`background`→`outlook`)の見出しと導入文がこの順序で常時表示されること、詳細文は`<details>`要素内にあり初期状態では閉じていること、`<summary>`のテキストが「詳細を見る」であること、発信者名・元URLリンクが表示されること、`belowCriteria: true`の場合のみ「専用枠(基準未達)」バッジと理由が表示されることを確認するテストを書く
  - 🟢 `app/news-digest/components/TopicSection.tsx`を実装する(CategoryBadge/ImportanceStarsを利用)

## フィードバック機能

- Task 8: フィードバック保存処理(仕様: requirements.md#運営者向けフィードバック-10、requirements.md#フィードバックの保存・権限-3)
  - 🔴 Supabaseクライアントをモックし、`article_date`・`topic_id`・`comment`・`is_test`が正しいカラム名でinsertされることを確認するテストを書く(成功/失敗の両方で戻り値が正しいことも確認)
  - 🟢 `app/news-digest/lib/saveFeedback.ts`に`saveFeedback`を実装する(`isTestData`判定を含む。ai-dev-digestの`saveFeedback.ts`と同じロジック)

- Task 9: フィードバック入力欄(仕様: requirements.md#運営者向けフィードバック-11〜12、design.md「フィードバックを送信する処理」)
  - 🔴 送信成功時に入力欄が空になり「送信しました」が表示されること、失敗時に入力内容が残り「送信に失敗しました。もう一度お試しください」が表示されること、入力欄が空文字または空白文字のみの場合は送信ボタンが無効化され送信されないことを確認するテストを書く
  - 🟢 `app/news-digest/components/FeedbackForm.tsx`を実装する(プレースホルダ文言「採用基準へのフィードバックを入力」)

- Task 10: ログイン状態によるフィードバック入力欄の表示切り替え(仕様: requirements.md#運営者向けフィードバック-9)
  - 🔴 セッションがあっても`isAuthorizedAdmin()`が`false`を返す場合はFeedbackFormが描画されないこと、`true`を返す場合のみ描画されること、セッションがない場合は`isAuthorizedAdmin()`自体が呼び出されないこと、`isAuthorizedAdmin()`が例外を投げた場合はFeedbackFormを描画せずコンソールにエラーを出力することを確認するテストを書く
  - 🟢 `TopicSection`に`isAdmin: boolean`propを追加し、`{isAdmin && <FeedbackForm .../>}`に変更する(`session`propはbookmark仕様のBookmarkPanel表示に使う)。`ArticleDetailView`にセッション確立後`isAuthorizedAdmin()`を呼び出す処理を実装し、結果を`isAdmin`としてTopicSectionへ渡す(失敗時は`false`のまま維持しコンソールにエラー出力)
  - 実装順序の注意: [bookmark/tasks.md](../bookmark/tasks.md)のTask 5(BookmarkPanelの表示配線)と同じ`TopicSection.tsx`/`ArticleDetailView.tsx`を変更する。どちらを先に実装してもよいが、両方完了するまでは中間状態(bookmarkのみ・isAdminのみ)になる

## ページ組み立て

- Task 11: 記事詳細ページ(仕様: requirements.md#記事本文表示-1、design.md「関連するファイル」)
  - `app/news-digest/[date]/page.tsx`を実装する。`generateStaticParams`で`getAllArticles()`の全日付を列挙し、`getArticleByDate`で本文を取得して`TopicSection`を並べる
  - ページ下部にログイン状態表示(`LoginStatus`。[bookmark/tasks.md](../bookmark/tasks.md)Task 8で実装)を配置し、`getSession`/`onAuthChange`/`signInWithGoogle`/`signOut`を配線する
  - 専用枠の基準未達トピックが1件以上ある場合、記事冒頭に注記文を表示する
  - page.tsx自体はNext.jsのルーティング用ファイルのためカバレッジ計測対象外(vitest.config.mtsの既存除外設定に従う)。新規テストは追加せず、Task 4〜10のユニットテストで担保する
