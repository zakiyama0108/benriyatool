# タスク分解: 計算結果の保存

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## ステータス: Task 1〜4 実装済み / Task 5〜7(テストフラグ追加分)は仕様確認待ち

- [x] Task 1: 合計取得日数の算出(仕様: requirements.md#機能要件-2)
  - [x] 🔴 給付金明細(benefits)の日数を合計した値が返ることを確認するテストを書く
  - [x] 🟢 `app/ikukyu/lib/saveResult.ts`に算出関数を実装する

- [x] Task 2: ikukyu_resultsテーブルへの保存(仕様: requirements.md#機能要件-1)
  - [x] 🔴 Supabaseクライアントをモックし、入力内容・合計額・合計取得日数が正しいカラム名でinsertされることを確認するテストを書く(ママ/パパ両モード)
  - [x] 🟢 `saveResult`関数を実装し、`app/lib/supabaseClient.ts`の共通クライアントでinsertする

- [x] Task 3: 保存失敗時にエラーを伝播させない(仕様: requirements.md#エッジケース・例外処理-1)
  - [x] 🔴 insertが例外を投げても`saveResult`はエラーを外に投げず正常終了することを確認するテストを書く
  - [x] 🟢 try/catchで保存失敗を握りつぶす実装にする

- [x] Task 4: 画面への配線
  - [x] `app/ikukyu/page.tsx`の`handleSubmit`から、計算結果の表示をブロックしない形で`saveResult`を呼び出す
  - [x] page.tsx自体に既存のテストはなく、観測可能なUIの挙動は変わらないため、新規テストは追加しない(Task1〜3で`saveResult`自体はテスト済みのため)

## テストフラグ(is_test)の追加

- [ ] Task 5: DBマイグレーション(design.md「データベース設計 > マイグレーション」のSQLをユーザーがSupabase SQLエディタで実行)
  - [ ] `is_test`カラム追加(boolean not null default false)
  - [ ] 既存レコードを全件`is_test = true`に更新(仕様: requirements.md#テストデータの判定-4)
  - [ ] Task 6以降の実装・動作確認より前に実行されていることを確認する

- [ ] Task 6: テストデータ判定関数(仕様: requirements.md#テストデータの判定-1〜3)
  - [ ] 🔴 開発環境ならtrue、URLクエリに`test=1`があればtrue、どちらでもなければfalseになることを確認するテストを書く
  - [ ] 🟢 判定関数を`app/ikukyu/lib/saveResult.ts`に実装する

- [ ] Task 7: 保存レコードへの`is_test`の追加(仕様: requirements.md#機能要件-3)
  - [ ] 🔴 insertされるレコードに`is_test`が判定結果どおりに含まれることを確認するテストを書く(既存のinsertテストの期待値にも`is_test`を追加する)
  - [ ] 🟢 `saveResult`のinsertに`is_test`を含める
