# タスク: 通報(ゲーム内容への気付き)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

前提(テーブル依存): ①[game-registration](../game-registration/tasks.md)のT0(`board_game_rules_games`。`game_id`の外部キー参照先)が先に必要。②運営者SELECTポリシーが参照する`admin_emails`テーブルは`ikukyu/admin`で作成済みの共用テーブルであり、本マイグレーション適用時点で存在している前提とする(本アプリでは新規作成しない。[user-auth/design.md](../user-auth/design.md)参照)。マイグレーションはこれらの後に適用する。

## T0. マイグレーション適用(実装より先に単独PRで適用)
- `board_game_rules_reports`テーブルとRLS(誰でもINSERT、運営者のみSELECT、readonly SELECT)、reasonのCHECK制約を`supabase/migrations/`に追加しCI適用する。運営者SELECTポリシーは共用の`admin_emails`を参照する(上記「前提」の②)
- design.md「データベース設計」T0の実機確認(anon/authenticatedのINSERT可・運営者のみSELECT・上限CHECK)を行う
- (TDD対象外)

## T1. 通報データ操作(`lib/reports.ts`)
- 🔴 game_id+任意理由でINSERTできること、理由なし(NULL)も送信できること、上限超過を弾くこと、失敗時の返し方をテストする(Supabaseクライアントをモック)
- 🟢 createReport を実装する
- 🔵 検証・エラー整形を整理する

## T2. 通報ボタン・フォーム(`components/ReportButton.tsx`)
- 🔴 「通報する」でフォームが開き、理由が任意入力(空でも送信可・上限あり)で送信できること、送信中のボタン無効化・同一ゲームへの短時間連投の簡易抑制、送信完了表示、失敗時の再送をテストする
- 🟢 4状態(閉/フォーム表示/送信中/完了)の通報ボタンとフォームを実装する
- 🔵 二重送信防止・失敗表示を整理する

## T3. 詳細画面への組み込み
- 🔴 詳細画面([game-detail](../game-detail/tasks.md))に`ReportButton`が配置され、ログインの有無に関わらず表示されることをテストする
- 🟢 `ReportButton`を詳細画面へ組み込む
- 🔵 導線の配置を整える

## 補足
- 初期はTurnstileを付けない(design.md「ボット対策・濫用防止」)。濫用が増えた場合にTurnstile導入を再検討する
