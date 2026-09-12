# タスク分解: 記事詳細ページ

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## データ基盤

- Task 1: `trend_digest_feedback`テーブルのマイグレーション(design.md「データベース設計」のSQL、適用基盤: docs/adr/0003)
  - `supabase/migrations/<timestamp>_create_trend_digest_feedback.sql`を作成する(テーブル作成+authenticated INSERT専用ポリシー+benriyatool_readonly SELECT専用ポリシー)
  - マイグレーションファイル単独のPRとしてマージし、`deploy.yml`のmigrateジョブが成功したことを確認する
  - 以降のタスク(フィードバック保存の実装・動作確認)より前に適用が完了していることを確認する

- Task 2: 記事データの型定義(仕様: design.md「前提: 記事データの形式」)
  - 🔴 型自体はTask 3のバリデーションテストから間接的に検証する
  - 🟢 `app/trend-digest/lib/types.ts`に`Edition`/`Genre`/`GENRE_ORDER`/`Topic`/`Article`を定義する

- Task 3: 記事データのバリデーション(仕様: design.md「バリデーション」)
  - 🔴 正常な記事データ(1件のみのケースを含む)が検証を通ること、`topics`が0件/11件で失敗すること、同一ジャンルのトピックが3件以上で失敗すること、`genre`が未定義値で失敗すること、`genre`は定義済みジャンルだが`article.edition`に対応する9ジャンル(`GENRE_ORDER[edition]`)に属さない場合(例: `edition: 'entertainment'`に`genre: 'gourmet'`)に失敗すること、`id`とファイル名不一致で失敗すること、`edition`が不正値で失敗すること、`sourceUrl`が`http`/`https`で始まらない場合に失敗すること、`heading`/`body`/`sourceTitle`/`sourceName`/`sourceUrl`が空文字で失敗することを確認するテストを書く
  - 🟢 `app/trend-digest/lib/articleSchema.ts`に`parseArticle(raw: unknown, filename: string): Article`を実装する(違反時は例外を投げる)
  - 🔵 エラーメッセージに違反内容(どのフィールドか)を含めて分かりやすくする

- Task 4: 記事データの読み込み(仕様: requirements.md#記事本文表示-1〜2)
  - 🔴 フィクスチャ用ディレクトリ(`__tests__`配下にテスト用JSONを配置)を対象に、`getArticleById`が該当IDを返すこと・存在しないIDは`null`を返すこと・不正なJSONを含むディレクトリでは例外が伝播することを確認するテストを書く
  - 🟢 `app/trend-digest/lib/articles.ts`に`getAllArticles(dir?)`/`getArticleById(id, dir?)`を実装する(`dir`省略時は`content/trend-digest/articles/`)

## 記事表示

- Task 5: ジャンル見出し+トピックカードの表示(仕様: requirements.md#記事本文表示-2〜4)
  - 🔴 `topics`に含まれるジャンルだけが`GENRE_ORDER`の順で見出し表示されること、含まれないジャンルは表示されないこと、各トピックの見出し・本文・出典(発信者名・元URLリンク、新規タブで開く`target="_blank"`)が表示されることを確認するテストを書く
  - 🟢 `app/trend-digest/components/GenreSection.tsx`・`app/trend-digest/components/TopicCard.tsx`を実装する

## フィードバック機能

- Task 6: フィードバック保存処理(仕様: requirements.md#運営者向けフィードバック-7、requirements.md#フィードバックの保存・権限-3)
  - 🔴 Supabaseクライアントをモックし、`article_id`・`topic_id`・`comment`・`is_test`が正しいカラム名でinsertされることを確認するテストを書く(成功/失敗の両方で戻り値が正しいことも確認)
  - 🟢 `app/trend-digest/lib/saveFeedback.ts`に`saveFeedback`を実装する(`isTestData`判定を含む。ロジックは`ai-dev-digest/lib/saveFeedback.ts`のテストデータ判定を踏襲)

- Task 7: フィードバック入力欄(仕様: requirements.md#運営者向けフィードバック-8〜9、design.md「フィードバックを送信する処理」)
  - 🔴 送信成功時に入力欄が空になり「送信しました」が表示されること、失敗時に入力内容が残り「送信に失敗しました。もう一度お試しください」が表示されること、入力欄が空文字または空白文字のみの場合は送信ボタンが無効化され送信されないことを確認するテストを書く
  - 🟢 `app/trend-digest/components/FeedbackForm.tsx`を実装する

- Task 8: ログイン状態によるフィードバック入力欄の表示切り替え(仕様: requirements.md#運営者向けフィードバック-6、design.md「ログイン状態に応じてフィードバック入力欄の表示を切り替える処理」)
  - 🔴 セッションがあっても`isAuthorizedAdmin()`が`false`を返す場合はFeedbackFormが描画されないこと、`true`を返す場合のみ描画されること、セッションがない場合は`isAuthorizedAdmin()`自体が呼び出されないこと、`isAuthorizedAdmin()`が例外を投げた場合はFeedbackFormを描画せずコンソールにエラーを出力することを確認するテストを書く
  - 🟢 `TopicCard`に`isAdmin: boolean`propを追加し、`{isAdmin && <FeedbackForm .../>}`にする。ページ本体にセッション確立後`isAuthorizedAdmin()`を呼び出す処理を追加し、結果を`isAdmin`として`GenreSection`経由で`TopicCard`へ渡す(失敗時は`false`のまま維持しコンソールにエラー出力)

## ページ組み立て

- Task 9: 記事詳細ページ(仕様: requirements.md#記事本文表示-1、design.md「関連するファイル」)
  - `app/trend-digest/[id]/page.tsx`を実装する。`generateStaticParams`で`getAllArticles()`の全IDを列挙し、`getArticleById`で本文を取得して`GenreSection`を並べる
  - ページ下部にログイン状態表示を配置し、`getSession`/`onAuthChange`/`signInWithGoogle`/`signOut`を配線する
  - page.tsx自体はNext.jsのルーティング用ファイルのためカバレッジ計測対象外(vitest.config.mtsの既存除外設定に従う)。新規テストは追加せず、Task 4〜8のユニットテストで担保する
