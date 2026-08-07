# タスク: ボードゲームの新規登録(写真からのルール生成)

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T0. マイグレーション適用(実装より先に単独PRで適用)
- `board_game_rules_game_requests`テーブルとRLS(誰でもINSERT・運営者のみSELECT/UPDATE/DELETE)、下限≤上限のCHECK制約、ジャンルの固定リストCHECK制約を`supabase/migrations/`に追加しCI適用する
- `board_game_rules_games`の変更(`is_official`列の削除、`release_year`列の追加、`genre`のCHECK制約化、anon/authenticatedのINSERTポリシー撤廃)を同じ単独PRに含める
- design.md「データベース設計」T0の実機確認(anonの依頼INSERT可・運営者以外のSELECT/UPDATE/DELETE不可・下限>上限のCHECK拒否・ジャンル固定リスト外の拒否)を行う
- Supabaseダッシュボードで Database Webhooks(INSERT on board_game_rules_game_requests → ntfy投稿先URL)を手動設定する(TDD対象外。design.md「運営者への通知」参照)
- (TDD対象外: マイグレーションの適用と手動確認)

## T1. ジャンルの固定選択肢(`lib/genres.ts`)
- 🔴 固定リストの値・順序が仕様どおりであることをテストする
- 🟢 ジャンルの選択肢定数を実装する(game-list/adminと共有)
- 🔵 型・命名を整理する

## T2. 依頼データ操作(`lib/gameRequests.ts`)
- 🔴 写真1枚以上+分類情報(すべて任意)で依頼を作成できること、写真0枚では作成できないこと(画面側バリデーション)、下限>上限は送信できないこと、写真保存/INSERT失敗時にエラーを返すことをテストする(Supabaseクライアントをモック)
- 🟢 createGameRequest(写真Storage保存→INSERT)を実装する
- 🔵 失敗時の握り方(入力保持・二重送信防止)を整理する

## T3. 写真アップローダー(`components/PhotoUploader.tsx`)
- 🔴 複数枚の写真選択・プレビュー表示・削除ができることをテストする
- 🟢 写真選択・プレビューを実装する
- 🔵 表示を整える

## T4. 登録依頼画面(`register/page.tsx`)
- 🔴 写真必須(0枚では送信不可)・分類情報は全項目任意であること、送信中の表示、成功時の完了表示(「受け付けました。運営者確認後に追加されます」)、失敗時の失敗表示・再送可能であることをテストする
- 🟢 写真アップロード+分類情報入力+送信の画面を組み立てる
- 🔵 待機表示・エラー表示・二重送信防止を整理する

## T5. 利用規約への追記(`app/legal/page.tsx`)
- 🔴 利用規約に、運営者が独自再構成したルール解説を掲載していること・権利者の申し出に速やかに対応する旨の条項が含まれることをテストする(表示テスト)
- 🟢 利用規約(知的財産の条項)に該当条項を追記する(requirements.md#利用規約への反映-8)
- 🔵 文言を整える

## 補足
- 運営者側の「まとめて登録する処理」(ローカルツール・Skill)は本specのスコープ外。[admin/tasks.md](../admin/tasks.md)を参照
- 依頼テーブルの一覧表示・処理済みマーク・削除操作(管理画面での確認)も[admin/tasks.md](../admin/tasks.md)側のタスク
