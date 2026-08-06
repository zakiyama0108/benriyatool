# タスク分解: 計算結果の保存

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- [ ] Task 1: DBマイグレーション(design.md「データベース設計 > マイグレーション」のSQL。適用基盤: docs/adr/0003)
  - [ ] `supabase/migrations/<timestamp>_create_life_money_sim_results.sql`を作成する(`life_money_sim_results`テーブル新設+RLS有効化+anonのINSERT専用ポリシー)
  - [ ] マイグレーションファイル単独のPRとしてマージし、deploy.ymlのmigrateジョブが成功したことを確認する
  - [ ] 以降のタスクの実装・動作確認より前に適用が完了していることを確認する

- [ ] Task 2: テストデータ判定関数(仕様: requirements.md#テストデータの判定-1〜3、design.md#テストデータかどうかを判定する処理)
  - [ ] 🔴 開発環境ならtrue、URLクエリに`test=1`があればtrue、どちらでもなければfalseになることを確認するテストを書く
  - [ ] 🟢 `app/life-money-sim/lib/saveResult.ts`に判定関数を実装する

- [ ] Task 3: 保存用レコードの組み立て関数(仕様: requirements.md#機能要件-1、design.md#試算結果を保存する処理)
  - [ ] 🔴 収支・資産推移の入力/計算結果から、design.mdのカラム定義どおりのレコードが組み立てられることを確認するテストを書く(配偶者なし・貯蓄のみモードでnullable項目がnullになるケースを含む)
  - [ ] 🟢 組み立て関数を実装する

- [ ] Task 4: life_money_sim_resultsテーブルへの保存(仕様: requirements.md#機能要件-1)
  - [ ] 🔴 Supabaseクライアントをモックし、組み立てたレコードが正しいカラム名でinsertされることを確認するテストを書く
  - [ ] 🟢 `saveResult`関数を実装し、`app/lib/supabaseClient.ts`の共通クライアントでinsertする

- [ ] Task 5: 保存失敗時にエラーを伝播させない(仕様: requirements.md#エッジケース・例外処理-1)
  - [ ] 🔴 insertが例外を投げても`saveResult`はエラーを外に投げず正常終了することを確認するテストを書く
  - [ ] 🟢 try/catchで保存失敗を握りつぶす実装にする

- [ ] Task 6: 保存ボタンの画面配線(仕様: design.md#試算結果を保存する処理、#エラーハンドリング)
  - [ ] `app/life-money-sim/components/SaveButton.tsx`を実装し、押下時に`saveResult`を呼び出す。送信中は再押下できないようにする
  - [ ] `page.tsx`に配線する(観測可能なUIの挙動としては保存完了表示のみのため、page.tsx自体の新規テストは追加しない)

## 修正: ボタン文言を「保存」から「送信」に変更(2026-08)

- [ ] Task 7: SaveButtonの文言変更(仕様: requirements.md#機能要件-3、design.md#試算結果を保存する処理)
  - [ ] `app/life-money-sim/components/SaveButton.tsx`のボタン文言を「この試算を保存する」から「この試算を実行する」に変更する(送信中表示・完了表示の文言もあわせて見直す)
  - [ ] `app/life-money-sim/components/ScenarioLoginPrompt.tsx`内の案内文言が参照しているボタン名を変更後の文言に合わせて更新する(`saved-scenario/tasks.md`の対応タスクと同一PRで行う)
