# タスク分解: 資産推移シミュレーション

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- [ ] Task 1: 型定義の追加(仕様: design.md#関連するファイル(抜粋))
  - [ ] `app/life-money-sim/lib/types.ts`に、開始資産額・開始年月・家族の生年月・イベント/賞与登録・運用モードの型を追加する

- [ ] Task 2: 対象年月の家族の年齢を求める関数(仕様: requirements.md#前提入力-3、requirements.md#月次の資産推移-3、design.md#対象年月の家族の年齢を求める処理)
  - [ ] 🔴 生年月と対象年月から満年齢が求まることを確認するテストを書く(誕生月前後の境界値を含む)
  - [ ] 🔴 配偶者・子どもが未登録の場合はその年齢がundefined(未表示扱い)になることを確認するテストを書く
  - [ ] 🟢 `app/life-money-sim/lib/assetProjection.ts`に算出関数を実装する

- [ ] Task 3: 当月の差引後余剰を求める関数(仕様: requirements.md#月次の資産推移-2、design.md#当月の差引後余剰を求める処理)
  - [ ] 🔴 月次余剰資金(賞与抜き)に当月の賞与を足し、当月のイベント合計を差し引いた値が返ることを確認するテストを書く(賞与なし・イベント複数件のケースを含む)
  - [ ] 🟢 算出関数を実装する

- [ ] Task 4: 貯蓄のみモードの月次資産推移を積み上げる関数(仕様: requirements.md#貯蓄/運用シミュレーションの切り替え-1、design.md#貯蓄のみモードで月次資産額を積み上げる処理)
  - [ ] 🔴 開始資産額に各月の差引後余剰を順に積み上げた配列が返ることを確認するテストを書く(表示範囲の月数分)
  - [ ] 🟢 積み上げ関数を実装する

- [ ] Task 5: 資産運用モードの月次資産推移を積み上げる関数(仕様: requirements.md#複利計算、design.md#資産運用モードで月次資産額を積み上げる処理)
  - [ ] 🔴 想定利回り(年率)を月利に換算し、前月資産額への運用益を加算したうえで差引後余剰を積み上げた配列が返ることを確認するテストを書く
  - [ ] 🔴 想定利回り0%の場合は貯蓄のみモードと同じ結果になることを確認するテストを書く
  - [ ] 🟢 積み上げ関数を実装する

- [ ] Task 6: 前提入力・家族生年月コンポーネント(仕様: requirements.md#前提入力、design.md#関連するファイル(抜粋))
  - [ ] `app/life-money-sim/components/StartingAssetForm.tsx`、`FamilyProfileForm.tsx`を実装する(配偶者・子どもの生年月は任意入力)

- [ ] Task 7: 賞与・イベント登録コンポーネント(仕様: requirements.md#賞与・イベントの登録)
  - [ ] `app/life-money-sim/components/EventListInput.tsx`を実装する(対象年月・名目・金額を指定して追加・削除)

- [ ] Task 8: モード切り替えコンポーネント(仕様: requirements.md#貯蓄/運用シミュレーションの切り替え)
  - [ ] `app/life-money-sim/components/ModeToggle.tsx`を実装する(想定利回り入力は資産運用選択時のみ表示)

- [ ] Task 9: 資産推移テーブルの表示(仕様: requirements.md#月次の資産推移、design.md#画面設計)
  - [ ] `app/life-money-sim/components/AssetProjectionTable.tsx`を実装する(年・月・家族の年齢・イベント名目・差引後余剰・資産推移累計額を1行ずつ表示)

- [ ] Task 10: 資産推移タブの画面配線(仕様: design.md#状態管理、#依存関係)
  - [ ] `app/life-money-sim/page.tsx`に「資産推移」タブを実装し、Task1〜9を配線する。`monthly-balance`タブの入力状態(月次余剰資金)を参照して計算する
