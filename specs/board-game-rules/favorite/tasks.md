# タスク: お気に入りのボードゲーム

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

前提: [game-registration](../game-registration/tasks.md)のT0(gamesテーブル)が先に必要。

## T0. マイグレーション適用(実装より先に単独PRで適用)
- `board_game_rules_favorites`テーブルとRLS(本人のSELECT/INSERT/DELETE、readonlyのSELECT)、`(user_id, game_id)`一意制約を`supabase/migrations/`に追加しCI適用する
- design.md「データベース設計」T0の実機確認(本人のみ操作可・他人不可視・anon不可・一意制約)を行う
- (TDD対象外)

## T1. お気に入りデータ操作(`lib/favorites.ts`)
- 🔴 画面内のお気に入りgame_id集合のまとめ取得、お気に入りゲーム一覧の登録日時降順取得(削除済みゲーム除外・photo_paths不取得)、登録INSERT・解除DELETE、失敗時の返し方をテストする(Supabaseクライアントをモック)
- 🟢 fetchMyFavoriteGameIds / fetchMyFavoriteGames / addFavorite / removeFavorite を実装する
- 🔵 取得方法(結合 or game_id集合取得)を整理する

## T2. お気に入りボタン(`components/FavoriteButton.tsx`)
- 🔴 未ログインではボタンを非表示にする(ログイン導線はヘッダーの`LoginStatus`に集約。design.md#画面設計で確定)、ログイン中は登録済み/未登録が分かること、トグルで登録・解除が呼ばれ表示が切り替わること、処理中はボタン無効・失敗時は表示を戻し失敗表示することをテストする
- 🟢 3状態(登録済み/未登録/処理中)のトグルボタンを実装する
- 🔵 二重操作防止・失敗表示を整理する

## T3. お気に入り一覧画面(`favorites/page.tsx`)
- 🔴 4状態(セッション確認中/未ログイン/取得中/表示中)の遷移、未ログイン時のログイン促し、0件案内、1件以上のカード一覧(登録日時降順)、その場解除、取得失敗時は0件扱いをテストする
- 🟢 セッション確認・一覧取得・カード表示・その場解除を組み立てる
- 🔵 状態遷移・ローディング表示を整理する

## 補足
- `FavoriteButton`は[game-list](../game-list/tasks.md)のカード・[game-detail](../game-detail/tasks.md)へ組み込む
- プライバシーポリシー更新要否は[user-auth](../user-auth/tasks.md)・[comment](../comment/tasks.md)と合わせて確認する
