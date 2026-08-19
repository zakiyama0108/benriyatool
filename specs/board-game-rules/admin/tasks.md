# タスク: 管理画面(モデレーション)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

前提: [game-registration](../game-registration/tasks.md)・[report](../report/tasks.md)・[comment](../comment/tasks.md)の各T0(テーブル・運営者向けRLS)が先に必要。

## T0. 元写真の非公開Storage設定(実装より先に単独PRで適用。適用済み)
- 非公開バケット(`board-game-rules-photos`、public=false)の作成と、Storageのアクセスポリシー(INSERTは誰でも可(ただしサイズ上限`file_size_limit`・許可MIME`allowed_mime_types`・1ゲームあたり枚数上限の量的制約付き)、SELECT(ダウンロード)は運営者のみ)を`supabase/migrations/20260807160400_create_board_game_rules_photos_storage.sql`で適用済み(design.md「元写真の非公開Storage」)。このバケットは[game-registration](../game-registration/tasks.md)の写真保存先
- design.md「データベース設計」T0の実機確認(運営者のみ元写真取得可・anon/非運営者不可、サイズ超過・許可外MIMEの拒否、games全行SELECT/UPDATE、reports SELECT、コメントDELETE、非運営者は不可)を行う
- (TDD対象外)

## T0b. ゲーム紹介画像の公開Storage設定(実装より先に単独PRで適用)
- 公開バケット(`board-game-rules-game-photos`、public=true)の作成と、Storageのアクセスポリシー(INSERTは誰でも可、UPDATE・DELETEは運営者のみ、SELECTは公開バケットのためポリシー不要)を`supabase/migrations/`に追加しCI適用する(design.md「ゲーム紹介画像の公開Storage」)
- [game-registration](../game-registration/tasks.md)のT0b(`intro_photo_paths`列追加)と同じ単独PRにまとめてよい(どちらも実装より先に適用する前提のマイグレーションのため)
- design.md「ゲーム紹介画像の公開Storage」T0の実機確認(anonのアップロード可・公開URLで認証なし取得可・運営者以外のUPDATE/DELETE不可・運営者本人はUPDATE/DELETE可・サイズ超過/許可外MIMEの拒否)を行う
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

## T3b. ゲーム紹介画像の差し替え・削除(`admin/lib/introPhotos.ts`)
- 🔴 新しい画像を公開バケットへアップロードして`intro_photo_paths`の末尾に追加できること、既存分と合わせて上限20枚に達している場合は追加分を切り捨てること(design.md「ゲーム紹介画像を差し替え・削除する処理」)、指定パスを配列から削除できること(Storageオブジェクト自体は削除しない)、指定画像を先頭へ移動できること(メイン画像への変更)、`board_game_rules_games`のUPDATEで保存すること、失敗時にエラーを返すことをテストする(Supabase/Storageクライアントをモック)
- 🟢 追加アップロード(上限20枚の切り捨て含む)・削除・並び替え(先頭へ移動)+UPDATE保存を実装する
- 🔵 失敗表示の握り方を整理する

## T4. 登録依頼データ操作(`admin/lib/gameRequests.ts`)
- 🔴 登録依頼を未処理優先・次いで新しい順に取得すること、processed_atをセットするUPDATE、依頼のDELETEが実行され、失敗時にエラーを返すことをテストする(Supabaseクライアントをモック)
- 🟢 fetchGameRequests / markGameRequestProcessed / deleteGameRequest を実装する
- 🔵 並び順・失敗表示を整理する

## T5. ログイン/権限画面(`admin/components/LoginScreen.tsx`)
- 🔴 未ログインでログイン促し、権限なしで「権限がありません」+ログアウト、が出ることをテストする(`ikukyu/admin`のLoginScreenと同等ロジック)
- 🟢 ログイン/権限なしの案内画面を実装する
- 🔵 共通ロジックの再利用を整理する

## T6. ゲーム一覧・編集・通報・登録依頼表示(`admin/components/GameModerationTable.tsx`, `GameEditForm.tsx`, `ReportsView.tsx`, `GameRequestsView.tsx`)
- 🔴 ゲーム一覧(通報件数順・削除済み区別・編集/削除/写真照合導線)、編集フォーム(登録時検証の再利用・上書き保存・ゲーム紹介画像のプレビュー/追加/削除/メイン画像への並び替え(T3b利用))、削除の確認ステップ、通報一覧と対象ゲームへの導線、登録依頼一覧(写真プレビュー・ゲーム紹介画像プレビュー(0枚時は自動補完の案内)・分類情報表示・処理済みマーク/削除)をテストする
- 🟢 各コンポーネントを実装する
- 🔵 表示・導線・確認ステップを整える

## T7. 管理画面本体(`admin/page.tsx`)
- 🔴 4状態(未ログイン/権限なし/権限あり/取得エラー)の遷移、権限ありで一覧・通報・編集・削除・写真照合・コメント削除・登録依頼の確認/処理済みマーク/削除が使えること、操作後の再取得をテストする
- 🟢 ログイン・権限確認・各機能の組み立てを実装する
- 🔵 状態遷移・エラー表示・二重操作防止を整理する

## T8. 登録依頼からゲームを登録するローカルツール(`.claude/skills/board-game-rules-batch-register/`)
- 対象: Claude Code Skill(Webアプリのコードではないため、通常のTDDサイクル・spec-coverageの対象外とする。動作確認は実際の写真セットで試す)
- SKILL.mdに次を記載する: ローカルフォルダの写真セット(または`board_game_rules_game_requests`の未処理依頼)を読み、写真を解析してゲーム情報・ルール本文(簡単版・詳しい版、共通章立て)を生成する手順、生成結果をSupabaseへ書き込むNode.jsスクリプトの使い方、依頼のゲーム紹介画像(`intro_photo_paths`)をそのまま引き継ぐ手順、0枚の場合の自動補完手順(下記T8b)
- Node.jsスクリプト(例: `scripts/board-game-rules/registerGame.ts`)を用意する。`SUPABASE_SERVICE_ROLE_KEY`等の特権クレデンシャルで`board_game_rules_games`へINSERTし、依頼由来の場合は対応する`board_game_rules_game_requests.processed_at`を更新する
- 動作確認: 実際に写真セットを用意してSkillを起動し、`board_game_rules_games`に正しく登録されること、依頼が処理済みになることを確認する

## T8b. ゲーム紹介画像の自動補完(`.claude/skills/board-game-rules-batch-register/`、`scripts/board-game-rules/registerGame.ts`)
- 対象: T8と同じくClaude Code Skill+Node.jsスクリプト(通常のTDDサイクル・spec-coverageの対象外。動作確認は実際のAPI呼び出しで試す)
- 画像検索: BoardGameGeek API(`https://boardgamegeek.com/xmlapi2/search`等)をゲーム名で呼び出し、box art画像URLを取得する処理を実装する(design.md「ゲーム紹介画像を自動補完する処理」手順1)。該当なしの場合は紹介画像なしで登録処理を続行する
- AI画像加工: 取得した画像を参考にGoogle Gemini API(画像生成/編集モデル)で新規画像を生成する処理を実装する(手順3)。`GEMINI_API_KEY`はローカル`.env`で管理する(リポジトリにコミットしない)
- 生成画像を公開Storageバケット(`board-game-rules-game-photos`)へゲームID配下でアップロードし、`intro_photo_paths`へ設定してからT8のINSERTに含める
- 画像検索・AI加工いずれかの失敗はゲーム登録自体を止めず、失敗理由をコンソールログに出す(design.md「ログ」)
- 動作確認: BoardGameGeekに実在するゲーム名・実在しないゲーム名それぞれで自動補完を試し、前者は紹介画像付きで登録され、後者は紹介画像なしで登録が完了することを確認する

## 方向B変更(2026-08-19): ゲーム個別モデレーションを詳細画面へ移設

> 上記T1〜T7は初版(admin一覧型)の実装履歴として残す。方向Bでは以下を行う。ゲーム編集・削除・元写真照合・コメント削除・紹介画像差し替えの**新実装は[game-detail/tasks.md](../game-detail/tasks.md)**で行い、adminからは撤去する。

- 🔴🟢🔵 **BT1. admin本体からゲーム一覧・編集フォームを撤去**(`admin/page.tsx`): 権限あり状態で表示するのは通報一覧(`ReportsView`)・登録依頼一覧(`GameRequestsView`)のみになること、`GameModerationTable`・`GameEditForm`を描画しないこと、状態から「ゲーム一覧」「編集中のゲーム」が消えることをテスト・実装する(既存の`admin/page.test.tsx`から一覧・編集・写真照合・コメント削除の検証を削除する)
- 🔴🟢🔵 **BT2. `ReportsView`の対象ゲーム導線を詳細画面リンクに変更**: 「編集・削除へ進む」ボタンを、対象ゲームの詳細画面(`/board-game-rules/detail?id=<ゲームID>`)への遷移リンクに置き換えることをテスト・実装する(`GameModerationTable.test.tsx`・`GameEditForm.test.tsx`は対応コンポーネントの撤去に伴い削除する)
- **BT3. 撤去するファイル**: `admin/lib/moderation.ts`・`admin/lib/photos.ts`・`admin/lib/introPhotos.ts`・`admin/lib/fetchAdminGames.ts`・`admin/components/GameModerationTable.tsx`・`admin/components/GameEditForm.tsx`と各テストを削除する(相当する処理はgame-detail側で新規実装。`moderation.ts`のゲーム削除は論理削除→**物理削除**に変わる点に注意)
- **BT4. spec-coverage追随**: adminのrequirements.mdは再設計中のためWIPマーカーで除外中。実装(BT1〜BT3・game-detail側)が揃ったらWIPマーカーを外し、`scripts/spec-coverage-skip.json`の当spec向けエントリ(あれば)を整理する

## 補足(リリース前チェック)
- Supabase AuthのRedirect URLs許可リストに管理画面の戻り先を登録する(requirements.md#認証手段とパスキー-5)。利用者ログインの戻り先`https://benriyatool.com/board-game-rules/**`は[user-auth](../user-auth/tasks.md)の責務で登録し、これは`/board-game-rules/admin/**`を包含するため、広い方の1エントリで管理画面の戻り先も兼ねられる(user-authと重複せず整理する)
- 運営者Googleアカウントのパスキー登録・2段階認証の維持を初回公開前に確認する(ADR-0006)
- Supabase Database Webhooks(登録依頼のINSERT→ntfy通知)をダッシュボードで手動設定する。設定は[game-registration/tasks.md](../game-registration/tasks.md)のT0に含まれる
