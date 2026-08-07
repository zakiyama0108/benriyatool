# タスク: コメント(ゲームごとの助け合い)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

前提(テーブル依存): ①[game-registration](../game-registration/tasks.md)のT0(`board_game_rules_games`テーブル。`game_id`の外部キー参照先)が先に必要。②運営者DELETEポリシーが参照する`admin_emails`テーブルは`ikukyu/admin`で作成済みの共用テーブルであり、本マイグレーション適用時点で存在している前提とする(本アプリでは新規作成しない。[user-auth/design.md](../user-auth/design.md)参照)。マイグレーションはこれらの後に適用する。

## T0. マイグレーション適用(実装より先に単独PRで適用)
- `board_game_rules_comments`テーブルとRLS(誰でもSELECT、本人INSERT/UPDATE、本人+運営者DELETE、readonly SELECT)、本文のCHECK制約を`supabase/migrations/`に追加しCI適用する。運営者DELETEポリシーは共用の`admin_emails`を参照する(上記「前提」の②)
- design.md「データベース設計」T0の実機確認(誰でもSELECT・本人のみINSERT/UPDATE・本人+運営者DELETE・上限CHECK)を行う
- (TDD対象外)

## T1. コメントデータ操作(`lib/comments.ts`)
- 🔴 対象ゲームのコメント投稿日時順取得、本人user_id+表示名でのINSERT、本文のUPDATE、DELETE、空/上限超過の検証、失敗時の返し方をテストする(Supabaseクライアント・セッションをモック)
- 🟢 fetchComments / createComment / updateComment / deleteComment を実装する(表示名はセッションから取得して保存)
- 🔵 検証・エラー整形を整理する

## T2. コメント1件(`components/CommentItem.tsx`)
- 🔴 表示名・日時・本文の表示、本人には編集・削除、運営者には削除が出ること、編集で本文UPDATE(空/上限で無効)、削除で一覧から除去、処理中の無効化・失敗表示をテストする
- 🟢 表示/編集中/処理中の3状態を持つコメント項目を実装する
- 🔵 編集フォーム・失敗表示を整理する

## T3. コメント欄(`components/CommentSection.tsx`)
- 🔴 一覧取得と表示、投稿フォーム(ログイン中のみ・空/空白/上限超過で送信無効)、投稿反映、未ログイン時のログイン促し、運営者判定に応じた削除操作の出し分け、取得失敗時のエラー表示をテストする
- 🟢 一覧取得・投稿フォーム・権限に応じた操作の出し分けを組み立てる(運営者判定は`isAuthorizedAdmin`、失敗時は非運営者扱い)
- 🔵 状態(読み込み中/表示中/取得エラー)と二重投稿防止を整理する

## T4. 詳細画面への組み込み・プライバシーポリシー追記
- 🔴 詳細画面([game-detail](../game-detail/tasks.md))に`CommentSection`が配置されること、プライバシーポリシーに表示名・本文の公開保存の記載があることをテストする
- 🟢 `CommentSection`を詳細画面へ組み込み、`app/legal/page.tsx`へコメント保存の記載を追記する(user-auth・favoriteと合わせて確認)
- 🔵 文言を整える
