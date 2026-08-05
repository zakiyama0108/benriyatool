# タスク分解: 記事詳細ページ

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## データ基盤

- Task 1: `ai_dev_digest_feedback`テーブルのマイグレーション(design.md「データベース設計」のSQL、適用基盤: docs/adr/0003)
  - `supabase/migrations/<timestamp>_create_ai_dev_digest_feedback.sql`を作成する(テーブル作成+anon INSERT専用ポリシー+benriyatool_readonly SELECT専用ポリシー。※このINSERT対象ロールは誤りだったため2026-08-05にTask 12でauthenticatedへ修正済み。現在のDB状態の正はTask 12・design.md「データベース設計」を参照)
  - マイグレーションファイル単独のPRとしてマージし、`deploy.yml`のmigrateジョブが成功したことを確認する
  - 以降のタスク(フィードバック保存の実装・動作確認)より前に適用が完了していることを確認する

- Task 2: 記事データの型定義(仕様: design.md「前提: 記事データの形式」)
  - 🔴 型自体はテスト対象外のため、Task 3のバリデーションテストから間接的に検証する
  - 🟢 `app/ai-dev-digest/lib/types.ts`に`SourceType`/`Topic`/`Article`を定義する

- Task 3: 記事データのバリデーション(仕様: design.md「バリデーション」)
  - 🔴 正常な記事データ(1件のみのケースを含む)が検証を通ること、`topics`が0件/6件で失敗すること、`sourceType`が未定義値で失敗すること、`belowCriteria: true`かつ`belowCriteriaReason`欠落で失敗すること、`date`とファイル名不一致で失敗すること、`sections`が1件(2件未満)またはセクションの`heading`/`teaser`/`detail`が空文字で失敗すること、`teaser`が40〜140字の範囲外で失敗すること、`sections`のdetail合計文字数が800〜1700字の範囲外で失敗することを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/articleSchema.ts`に`parseArticle(raw: unknown, filename: string): Article`を実装する(違反時は例外を投げる)
  - 🔵 エラーメッセージに違反内容(どのフィールドか)を含めて分かりやすくする

- Task 4: 記事データの読み込み(仕様: requirements.md#記事本文表示-1〜2)
  - 🔴 フィクスチャ用ディレクトリ(`__tests__`配下にテスト用JSONを配置)を対象に、`getArticleByDate`が該当日を返すこと・存在しない日は`null`を返すこと・不正なJSONを含むディレクトリでは例外が伝播することを確認するテストを書く
  - 🟢 `app/ai-dev-digest/lib/articles.ts`に`getAllArticles(dir?)`/`getArticleByDate(date, dir?)`を実装する(`dir`省略時は`content/ai-dev-digest/articles/`)

## 記事表示

- Task 5: 情報源種別バッジ(仕様: requirements.md#記事本文表示-5)
  - 🔴 各`SourceType`に対応する日本語ラベルが表示されることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/components/SourceBadge.tsx`を実装する

- Task 6: YouTube埋め込み(仕様: design.md「その日の記事本文を表示する処理」手順6、content-generation/requirements.md#著作権への配慮-6)
  - 🔴 `videoId`から`youtube-nocookie.com`ドメインの`<iframe>`が生成されることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/components/YoutubeEmbed.tsx`を実装する

- Task 7: トピック表示(見出し・章立て要約・出典・基準未達バッジ)(仕様: requirements.md#記事本文表示-1〜5)
  - 🔴 見出し・全セクションの見出しと導入文(`teaser`)が常時表示されること、詳細文(`detail`)は`<details>`要素内にあり初期状態では閉じていること、`<summary>`のテキストが「詳細を見る」であること、発信者名・元URLリンクが表示されること、`youtubeVideoId`がある場合のみYoutubeEmbedが描画されること、`belowCriteria: true`の場合のみ「採用基準未達」バッジと理由が表示されることを確認するテストを書く
  - 🟢 `app/ai-dev-digest/components/TopicSection.tsx`を実装する(SourceBadge/YoutubeEmbedを利用。`sections`配列を順に描画し、各セクションを`<details><summary>詳細を見る</summary>{section.detail}</details>`で構成する)

## フィードバック機能

- Task 8: フィードバック保存処理(仕様: requirements.md#運営者向けフィードバック-8、requirements.md#フィードバックの保存・権限-3)
  - 🔴 Supabaseクライアントをモックし、`article_date`・`topic_id`・`comment`・`is_test`が正しいカラム名でinsertされることを確認するテストを書く(成功/失敗の両方で戻り値が正しいことも確認)
  - 🟢 `app/ai-dev-digest/lib/saveFeedback.ts`に`saveFeedback`を実装する(`isTestData`判定を含む。ロジックは`life-money-sim/lib/saveResult.ts`のテストデータ判定を踏襲)

- Task 9: フィードバック入力欄(仕様: requirements.md#運営者向けフィードバック-9〜10、design.md「フィードバックを送信する処理」)
  - 🔴 送信成功時に入力欄が空になり「送信しました」が表示されること、失敗時に入力内容が残り「送信に失敗しました。もう一度お試しください」が表示されること、入力欄が空文字または空白文字のみの場合は送信ボタンが無効化され送信されないことを確認するテストを書く
  - 🟢 `app/ai-dev-digest/components/FeedbackForm.tsx`を実装する

- Task 10: ログイン状態によるフィードバック入力欄の表示切り替え(仕様: requirements.md#運営者向けフィードバック-7)
  - 🔴 セッションがある場合のみFeedbackFormが描画されることを確認するテストを書く(`isAuthorizedAdmin`は呼び出されないこともあわせて確認する)
  - 🟢 `TopicSection`に`session`propを渡し、条件付きレンダリングを実装する

## ページ組み立て

- Task 11: 記事詳細ページ(仕様: requirements.md#記事本文表示-1、design.md「関連するファイル」)
  - `app/ai-dev-digest/[date]/page.tsx`を実装する。`generateStaticParams`で`getAllArticles()`の全日付を列挙し、`getArticleByDate`で本文を取得して`TopicSection`を並べる
  - ページ下部にログイン状態表示(`life-money-sim`の`LoginStatus`と同様の表示)を配置し、`getSession`/`onAuthChange`/`signInWithGoogle`/`signOut`を配線する
  - page.tsx自体はNext.jsのルーティング用ファイルのためカバレッジ計測対象外(vitest.config.mtsの既存除外設定に従う)。新規テストは追加せず、Task 4〜10のユニットテストで担保する

## バグ修正

- Task 12(2026-08-05): フィードバック送信が本番で常に失敗するバグの修正(仕様: requirements.md#フィードバックの保存・権限-3、design.md「データベース設計」)
  - Task 1のマイグレーションが`ai_dev_digest_feedback`のINSERT権限を`anon`ロールへ付与していたが、この入力欄はログイン中のみ表示されるため、実際のリクエストは常に`authenticated`ロールで行われる。ロールの不一致によりRLSがINSERTを拒否し、フィードバック送信が本番で常に失敗していた
  - `supabase/migrations/20260805135824_fix_ai_dev_digest_feedback_insert_role.sql`で、`anon`のINSERT権限・ポリシーを削除し`authenticated`へ付け替える
  - アプリコード(`saveFeedback.ts`/`FeedbackForm.tsx`)はSupabaseクライアントが現在のセッションに応じたロールを自動的に使うため変更不要。RLS/GRANTはVitestではモックされ検証できないため、本番適用後の実機確認で担保する
