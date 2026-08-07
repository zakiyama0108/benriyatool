# タスク: 管理画面(モデレーション)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

前提: [game-registration](../game-registration/tasks.md)・[report](../report/tasks.md)・[comment](../comment/tasks.md)の各T0(テーブル・運営者向けRLS)が先に必要。

## T0. 元写真の非公開Storage設定(実装より先に単独PRで適用)
- 非公開バケットの作成と、Storageのアクセスポリシー(INSERTは誰でも可、SELECT(ダウンロード)は運営者のみ、public=false)を`supabase/migrations/`に追加しCI適用する(バケット名・パス設計は実装時確定)
- design.md「データベース設計」T0の実機確認(運営者のみ元写真取得可・anon/非運営者不可、games全行SELECT/UPDATE、reports SELECT、コメントDELETE、非運営者は不可)を行う
- (TDD対象外)

## T1. 管理データ取得(`admin/lib/fetchAdminGames.ts`, `admin/lib/fetchReports.ts`)
- 🔴 全ゲーム(削除済み含む)を通報件数付きで、通報件数の多い順(次いで新しい順)に取得すること、通報一覧(対象ゲーム・日時・理由)を取得すること、失敗時にエラーを返すことをテストする(Supabaseクライアントをモック)
- 🟢 全ゲーム+通報件数の取得、通報一覧の取得を実装する
- 🔵 集計・並びの取り方を整理する

## T2. モデレーション操作(`admin/lib/moderation.ts`)
- 🔴 ゲームの編集(登録時と同じ検証を通したUPDATE)、論理削除(deleted_atをセットするUPDATE)、コメント削除(comments.deleteCommentの利用)が実行され、失敗時にエラーを返すことをテストする
- 🟢 編集・論理削除・コメント削除を実装する
- 🔵 検証再利用・失敗表示を整理する

## T3. 元写真取得(`admin/lib/photos.ts`)
- 🔴 photo_pathsから非公開Storageの元写真を取得できること、失敗時の扱いをテストする(Storageクライアントをモック)
- 🟢 運営者として元写真を取得する関数を実装する
- 🔵 取得エラーの扱いを整理する

## T4. ログイン/権限画面(`admin/components/LoginScreen.tsx`)
- 🔴 未ログインでログイン促し、権限なしで「権限がありません」+ログアウト、が出ることをテストする(`ikukyu/admin`のLoginScreenと同等ロジック)
- 🟢 ログイン/権限なしの案内画面を実装する
- 🔵 共通ロジックの再利用を整理する

## T5. ゲーム一覧・編集・通報表示(`admin/components/GameModerationTable.tsx`, `GameEditForm.tsx`, `ReportsView.tsx`)
- 🔴 ゲーム一覧(通報件数順・削除済み区別・編集/削除/写真照合導線)、編集フォーム(登録時検証の再利用・上書き保存)、削除の確認ステップ、通報一覧と対象ゲームへの導線をテストする
- 🟢 各コンポーネントを実装する
- 🔵 表示・導線・確認ステップを整える

## T6. 管理画面本体(`admin/page.tsx`)
- 🔴 4状態(未ログイン/権限なし/権限あり/取得エラー)の遷移、権限ありで一覧・通報・編集・削除・写真照合・コメント削除が使えること、操作後の再取得をテストする
- 🟢 ログイン・権限確認・各機能の組み立てを実装する
- 🔵 状態遷移・エラー表示・二重操作防止を整理する

## 補足(リリース前チェック)
- Supabase AuthのRedirect URLs許可リストに`https://benriyatool.com/board-game-rules/admin/**`を本番公開前に登録する(requirements.md#認証手段とパスキー-5)
- 運営者Googleアカウントのパスキー登録・2段階認証の維持を初回公開前に確認する(ADR-0006)
