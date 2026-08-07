# タスク: 管理画面(モデレーション)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

前提: [game-registration](../game-registration/tasks.md)・[report](../report/tasks.md)・[comment](../comment/tasks.md)の各T0(テーブル・運営者向けRLS)が先に必要。

## T0. 元写真の非公開Storage設定(実装より先に単独PRで適用)
- 非公開バケットの作成と、Storageのアクセスポリシー(INSERTは誰でも可(ただしサイズ上限`file_size_limit`・許可MIME`allowed_mime_types`・1ゲームあたり枚数上限の量的制約付き)、SELECT(ダウンロード)は運営者のみ、public=false)を`supabase/migrations/`に追加しCI適用する(バケット名・パス設計・制約値は実装時確定)。このバケットは[game-registration](../game-registration/tasks.md)の写真保存先で、確定適用の責務は本specに置く
- design.md「データベース設計」T0の実機確認(運営者のみ元写真取得可・anon/非運営者不可、サイズ超過・許可外MIMEの拒否、games全行SELECT/UPDATE、reports SELECT、コメントDELETE、非運営者は不可)を行う
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

## T4. 登録依頼データ操作(`admin/lib/gameRequests.ts`)
- 🔴 登録依頼を未処理優先・次いで新しい順に取得すること、processed_atをセットするUPDATE、依頼のDELETEが実行され、失敗時にエラーを返すことをテストする(Supabaseクライアントをモック)
- 🟢 fetchGameRequests / markGameRequestProcessed / deleteGameRequest を実装する
- 🔵 並び順・失敗表示を整理する

## T5. ログイン/権限画面(`admin/components/LoginScreen.tsx`)
- 🔴 未ログインでログイン促し、権限なしで「権限がありません」+ログアウト、が出ることをテストする(`ikukyu/admin`のLoginScreenと同等ロジック)
- 🟢 ログイン/権限なしの案内画面を実装する
- 🔵 共通ロジックの再利用を整理する

## T6. ゲーム一覧・編集・通報・登録依頼表示(`admin/components/GameModerationTable.tsx`, `GameEditForm.tsx`, `ReportsView.tsx`, `GameRequestsView.tsx`)
- 🔴 ゲーム一覧(通報件数順・削除済み区別・編集/削除/写真照合導線)、編集フォーム(登録時検証の再利用・上書き保存)、削除の確認ステップ、通報一覧と対象ゲームへの導線、登録依頼一覧(写真プレビュー・分類情報表示・処理済みマーク/削除)をテストする
- 🟢 各コンポーネントを実装する
- 🔵 表示・導線・確認ステップを整える

## T7. 管理画面本体(`admin/page.tsx`)
- 🔴 4状態(未ログイン/権限なし/権限あり/取得エラー)の遷移、権限ありで一覧・通報・編集・削除・写真照合・コメント削除・登録依頼の確認/処理済みマーク/削除が使えること、操作後の再取得をテストする
- 🟢 ログイン・権限確認・各機能の組み立てを実装する
- 🔵 状態遷移・エラー表示・二重操作防止を整理する

## T8. 登録依頼からゲームを登録するローカルツール(`.claude/skills/board-game-rules-batch-register/`)
- 対象: Claude Code Skill(Webアプリのコードではないため、通常のTDDサイクル・spec-coverageの対象外とする。動作確認は実際の写真セットで試す)
- SKILL.mdに次を記載する: ローカルフォルダの写真セット(または`board_game_rules_game_requests`の未処理依頼)を読み、写真を解析してゲーム情報・ルール本文(簡単版・詳しい版、共通章立て)を生成する手順、生成結果をSupabaseへ書き込むNode.jsスクリプトの使い方
- Node.jsスクリプト(例: `scripts/board-game-rules/registerGame.ts`)を用意する。`SUPABASE_SERVICE_ROLE_KEY`等の特権クレデンシャルで`board_game_rules_games`へINSERTし、依頼由来の場合は対応する`board_game_rules_game_requests.processed_at`を更新する
- 動作確認: 実際に写真セットを用意してSkillを起動し、`board_game_rules_games`に正しく登録されること、依頼が処理済みになることを確認する

## 補足(リリース前チェック)
- Supabase AuthのRedirect URLs許可リストに管理画面の戻り先を登録する(requirements.md#認証手段とパスキー-5)。利用者ログインの戻り先`https://benriyatool.com/board-game-rules/**`は[user-auth](../user-auth/tasks.md)の責務で登録し、これは`/board-game-rules/admin/**`を包含するため、広い方の1エントリで管理画面の戻り先も兼ねられる(user-authと重複せず整理する)
- 運営者Googleアカウントのパスキー登録・2段階認証の維持を初回公開前に確認する(ADR-0006)
- Supabase Database Webhooks(登録依頼のINSERT→ntfy通知)をダッシュボードで手動設定する。設定は[game-registration/tasks.md](../game-registration/tasks.md)のT0に含まれる
