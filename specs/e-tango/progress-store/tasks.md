> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T0: マイグレーション適用(実装より先に単独PRで適用)
- 対象ファイル: `supabase/migrations/<タイムスタンプ>_create_e_tango_progress_tables.sql`
- 内容: design.md#データベース設計の5テーブル(`e_tango_cards`/`e_tango_sessions`/`e_tango_study_days`/`e_tango_review_logs`/`e_tango_settings`)・RLS・`benriyatool_readonly`向けSELECTポリシーをそのまま適用する
- 実機確認: 本人のみ各テーブルをSELECT/INSERT/UPDATE/DELETEできること、他人の行は操作できないこと、未ログイン(`anon`)では一切操作できないことを確かめる

## T1: カード状態の読み込み・保存(e_tango_cards)
- 🔴 `__tests__/e-tango/lib/progressStore.test.ts`: `fetchCards()`が本人のカード一覧を返すこと、`upsertCard()`が新規語はINSERT・既存語はUPDATEすることを検証するテストを書く(Supabaseクライアントはモック化)
- 🟢 `app/e-tango/lib/progressStore.ts`に`fetchCards`/`upsertCard`を実装する
- 🔵 Supabaseの`{error}`応答・例外どちらも失敗として扱う共通のエラー変換処理を切り出す

## T2: セッション進行の読み込み・保存・削除(e_tango_sessions)
- 🔴 `fetchSession(date)`が当日行を返すこと(なければnull)、`upsertSession()`が未消化キュー・連続正解カウントを保存すること、`deleteSession()`が完了時に行を削除することを検証するテストを書く
- 🟢 `progressStore.ts`に`fetchSession`/`upsertSession`/`deleteSession`を実装する
- 🔵 `remaining`(jsonb)の型をT2内で定義し、`study-session`から使いやすい形にする

## T3: 学習日ログの読み込み・保存(e_tango_study_days)
- 🔴 `fetchStudyDays(limit)`が日付降順で返すこと、`incrementStudyDay(date, kind)`が新規/復習いずれかのカウントを+1することを検証するテストを書く
- 🟢 `progressStore.ts`に`fetchStudyDays`/`incrementStudyDay`を実装する
- 🔵 当日行がない場合の初期化(new_count/review_count=0)を関数内に整理する

## T4: 出題ログの保存(e_tango_review_logs)
- 🔴 `insertReviewLog()`が対象語・出題パターン・正誤・回答時間・ヒント使用・4段階判定を1行としてINSERTすることを検証するテストを書く
- 🟢 `progressStore.ts`に`insertReviewLog`を実装する
- 🔵 型(`ReviewLogInput`)をエクスポートし、`study-session`から使いやすくする

## T5: 学習設定の読み込み・保存(e_tango_settings)
- 🔴 `fetchSettings()`が未設定時に既定値(新規10語・保持率90%)を返すこと、`upsertSettings()`が本人行をupsertすることを検証するテストを書く
- 🟢 `progressStore.ts`に`fetchSettings`/`upsertSettings`を実装する
- 🔵 既定値を定数化し他機能(`study-settings`)と共有できるようにする

## T6: 出題への回答をまとめて保存する処理(独立した失敗許容)
- 🔴 `saveAnswerResult()`が4つの保存(カード状態・セッション進行・学習日ログ・出題ログ)を並行実行し、1つが失敗しても他3つの結果が反映されることを検証するテストを書く(`Promise.allSettled`相当の挙動)
- 🟢 `progressStore.ts`に`saveAnswerResult`を実装する
- 🔵 失敗した保存の一覧を戻り値として返す形に整理し、呼び出し側(`study-session`)が再試行の要否を判断できるようにする
