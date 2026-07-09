# タスク分解: 計算結果の保存

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## ステータス: 未着手(仕様確認待ち)

- [x] Task 1: 合計取得日数の算出(仕様: requirements.md#機能要件-2)
  - [x] 🔴 給付金明細(benefits)の日数を合計した値が返ることを確認するテストを書く
  - [x] 🟢 `app/ikukyu/lib/saveResult.ts`に算出関数を実装する

- [x] Task 2: ikukyu_resultsテーブルへの保存(仕様: requirements.md#機能要件-1)
  - [x] 🔴 Supabaseクライアントをモックし、入力内容・合計額・合計取得日数が正しいカラム名でinsertされることを確認するテストを書く(ママ/パパ両モード)
  - [x] 🟢 `saveResult`関数を実装し、`app/lib/supabaseClient.ts`の共通クライアントでinsertする

- [ ] Task 3: 保存失敗時にエラーを伝播させない(仕様: requirements.md#エッジケース・例外処理-1)
  - [ ] 🔴 insertが例外を投げても`saveResult`はエラーを外に投げず正常終了することを確認するテストを書く
  - [ ] 🟢 try/catchで保存失敗を握りつぶす実装にする

- [ ] Task 4: 画面への配線
  - [ ] `app/ikukyu/page.tsx`の`handleSubmit`から、計算結果の表示をブロックしない形で`saveResult`を呼び出す
  - [ ] page.tsx自体に既存のテストはなく、観測可能なUIの挙動は変わらないため、新規テストは追加しない(Task1〜3で`saveResult`自体はテスト済みのため)
