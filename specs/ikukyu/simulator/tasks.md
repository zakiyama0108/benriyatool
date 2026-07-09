# タスク: 育休給付金シミュレーター

> TDDで進める。各機能ごとに 🔴 Red → 🟢 Green → 🔵 Refactor のサイクルを完結させる。

## ステータス: 完了

- [x] 0. UIガワ作成（ページ・コンポーネント雛形）
- [x] 1. 型定義（types.ts）
- [x] 2. 日付・期間ユーティリティ（dateUtils.ts）
- [x] 3. ママの給付金計算（出産手当金・育休67%・育休50%）
- [x] 4. パパの給付金計算（産後パパ育休・育休67%・育休50%）
- [x] 5. 共通処理（上限チェック・出力データ生成・振込スケジュール）
- [x] 6. コンポーネント実装（BenefitCard・PaymentSchedule 等）
- [x] 7. ページ組み込み（app/ikukyu/page.tsx）
- [x] 8. 総合確認・バグ修正
- [x] 9. パパモードへの出産予定日入力追加（産後パパ育休の日数計算の誤りを修正、PR #14）
  - [x] `CalculatorInput` に `leaveStartDate?: string` を追加
  - [x] `calcPapaChildcare67`/`calcPapaChildcare50`: dueDate起点からleaveStartDate + paternityDays起点の計算に変更
  - [x] `InputForm`（パパモード）: 出産予定日 + 育休開始日 + 育休終了予定日の3入力に変更
  - [x] 新規テスト: 育休開始日が8週間超 → paternityDays=0、育休開始日が8週間内の終盤 → paternityDays<28
