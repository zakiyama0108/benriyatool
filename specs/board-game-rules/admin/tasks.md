# タスク: 管理画面(モデレーション)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。
> 本管理画面はログイン・通報一覧の確認・登録依頼の確認/処理を担う。ゲーム1件ごとの編集・削除・紹介画像差し替え・元写真照合・コメント削除は詳細画面([game-detail/tasks.md](../game-detail/tasks.md))で実装する。

前提: [game-registration](../game-registration/tasks.md)・[report](../report/tasks.md)・[comment](../comment/tasks.md)の各T0(テーブル・運営者向けRLS)が先に必要。

## T0. 元写真の非公開Storage設定(実装より先に単独PRで適用。適用済み)
- 非公開バケット(`board-game-rules-photos`、public=false)の作成と、Storageのアクセスポリシー(INSERTは誰でも可(サイズ上限`file_size_limit`・許可MIME`allowed_mime_types`・1ゲームあたり枚数上限の量的制約付き)、SELECT(ダウンロード)は運営者のみ)を`supabase/migrations/20260807160400_create_board_game_rules_photos_storage.sql`で適用済み(design.md「元写真の非公開Storage」)。このバケットは[game-registration](../game-registration/tasks.md)の写真保存先
- design.md「元写真の非公開Storage」T0の実機確認(運営者のみ元写真取得可・anon/非運営者不可、サイズ超過・許可外MIMEの拒否、games全行SELECT、reports SELECT、game_requests SELECT/UPDATE/DELETE、非運営者は不可)を行う
- (TDD対象外)

## T0b. ゲーム紹介画像の公開Storage設定(実装より先に単独PRで適用)
- 公開バケット(`board-game-rules-game-photos`、public=true)の作成と、Storageのアクセスポリシー(INSERTは誰でも可、UPDATE・DELETEは運営者のみ、SELECTは公開バケットのためポリシー不要)を`supabase/migrations/`に追加しCI適用する(design.md「ゲーム紹介画像の公開Storage」)
- [game-registration](../game-registration/tasks.md)のT0b(`intro_photo_paths`列追加)と同じ単独PRにまとめてよい
- design.md「ゲーム紹介画像の公開Storage」T0の実機確認を行う
- (TDD対象外)

## T1. 通報一覧の取得(`admin/lib/fetchReports.ts`)
- 🔴 通報一覧(対象ゲーム・日時・理由)を取得すること、失敗時にエラーを返すことをテストする(Supabaseクライアントをモック)
- 🟢 通報一覧の取得を実装する
- 🔵 並びの取り方を整理する

## T2. 登録依頼データ操作(`admin/lib/gameRequests.ts`)
- 🔴 登録依頼を未処理優先・次いで新しい順に取得すること、processed_atをセットするUPDATE、依頼のDELETEが実行され、失敗時にエラーを返すことをテストする(Supabaseクライアントをモック)
- 🟢 fetchGameRequests / markGameRequestProcessed / deleteGameRequest を実装する
- 🔵 並び順・失敗表示を整理する

## T3. ログイン/権限画面(`admin/components/LoginScreen.tsx`)
- 🔴 未ログインでログイン促し、権限なしで「権限がありません」+ログアウト、が出ることをテストする(`ikukyu/admin`のLoginScreenと同等ロジック)
- 🟢 ログイン/権限なしの案内画面を実装する
- 🔵 共通ロジックの再利用を整理する

## T4. 通報一覧・登録依頼表示(`admin/components/ReportsView.tsx`, `GameRequestsView.tsx`)
- 🔴 通報一覧(対象ゲーム・日時・理由と、対象ゲームの詳細画面(`/board-game-rules/detail?id=<ゲームID>`)への遷移リンク)、登録依頼一覧(写真プレビュー・ゲーム紹介画像プレビュー(0枚時は自動補完の案内)・分類情報表示・処理済みマーク/削除)をテストする
- 🟢 各コンポーネントを実装する
- 🔵 表示・導線を整える

## T5. 管理画面本体(`admin/page.tsx`)
- 🔴 4状態(未ログイン/権限なし/権限あり/取得エラー)の遷移、権限ありで通報一覧・登録依頼の確認/処理済みマーク/削除が使えること、操作後の再取得をテストする
- 🟢 ログイン・権限確認・通報一覧・登録依頼一覧の組み立てを実装する
- 🔵 状態遷移・エラー表示・二重操作防止を整理する

## T6. 登録依頼からゲームを登録するローカルツール(`.claude/skills/board-game-rules-batch-register/`)
- 対象: Claude Code Skill(Webアプリのコードではないため、通常のTDDサイクル・spec-coverageの対象外とする。動作確認は実際の写真セットで試す)
- SKILL.mdに次を記載する: ローカルフォルダの写真セット(または`board_game_rules_game_requests`の未処理依頼)を読み、写真を解析してゲーム情報・ルール本文(簡単版・詳しい版、共通章立て)を生成する手順、生成結果をSupabaseへ書き込むNode.jsスクリプトの使い方、依頼のゲーム紹介画像(`intro_photo_paths`)をそのまま引き継ぐ手順、0枚の場合の自動補完手順(下記T6b)
- Node.jsスクリプト(例: `scripts/board-game-rules/registerGame.ts`)を用意する。`SUPABASE_SERVICE_ROLE_KEY`等の特権クレデンシャルで`board_game_rules_games`へINSERTし、依頼由来の場合は対応する`board_game_rules_game_requests.processed_at`を更新する
- 動作確認: 実際に写真セットを用意してSkillを起動し、`board_game_rules_games`に正しく登録されること、依頼が処理済みになることを確認する

## T6b. ゲーム紹介画像の自動補完(`.claude/skills/board-game-rules-batch-register/`、`scripts/board-game-rules/registerGame.ts`)
- 対象: T6と同じくClaude Code Skill+Node.jsスクリプト(通常のTDDサイクル・spec-coverageの対象外。動作確認は実際のAPI呼び出しで試す)
- 画像検索: BoardGameGeek API(`https://boardgamegeek.com/xmlapi2/search`等)をゲーム名で呼び出し、box art画像URLを取得する処理を実装する(design.md「ゲーム紹介画像を自動補完する処理」手順1)。該当なしの場合は紹介画像なしで登録処理を続行する
- AI画像加工: 取得した画像を参考にGoogle Gemini API(画像生成/編集モデル)で新規画像を生成する処理を実装する(手順3)。`GEMINI_API_KEY`はローカル`.env`で管理する(リポジトリにコミットしない)
- 生成画像を公開Storageバケット(`board-game-rules-game-photos`)へゲームID配下でアップロードし、`intro_photo_paths`へ設定してからT6のINSERTに含める
- 画像検索・AI加工いずれかの失敗はゲーム登録自体を止めず、失敗理由をコンソールログに出す(design.md「ログ」)
- 動作確認: BoardGameGeekに実在するゲーム名・実在しないゲーム名それぞれで自動補完を試し、前者は紹介画像付きで登録され、後者は紹介画像なしで登録が完了することを確認する

## 補足(リリース前チェック)
- Supabase AuthのRedirect URLs許可リストに管理画面の戻り先を登録する(requirements.md#認証手段とパスキー-5)。利用者ログインの戻り先`https://benriyatool.com/board-game-rules/**`は[user-auth](../user-auth/tasks.md)の責務で登録し、これは`/board-game-rules/admin/**`を包含するため、広い方の1エントリで管理画面の戻り先も兼ねられる(user-authと重複せず整理する)
- 運営者Googleアカウントのパスキー登録・2段階認証の維持を初回公開前に確認する(ADR-0006)
- Supabase Database Webhooks(登録依頼のINSERT→ntfy通知)をダッシュボードで手動設定する。設定は[game-registration/tasks.md](../game-registration/tasks.md)のT0に含まれる
