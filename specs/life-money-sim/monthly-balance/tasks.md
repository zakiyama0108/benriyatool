# タスク分解: 月次収支バランス計算

> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

- [ ] Task 1: 型定義(仕様: design.md#関連するファイル(抜粋))
  - [ ] `app/life-money-sim/lib/types.ts`に、内訳リスト(`{name: string; amount: number}[]`)・収入・家計負担の入力型を定義する(テストなしで進めてよい純粋な型定義)

- [ ] Task 2: 個人支出の月合計を計算する関数(仕様: requirements.md#個人支出-3、design.md#個人支出の月合計を計算する処理)
  - [ ] 🔴 年額固定費の合計を12で割った額と月額固定費の合計を足した値が返ることを確認するテストを書く(内訳が空の場合・複数件ある場合)
  - [ ] 🟢 `app/life-money-sim/lib/monthlyBalance.ts`に算出関数を実装する

- [ ] Task 3: 内訳金額のバリデーション(仕様: design.md#バリデーション)
  - [ ] 🔴 金額が負数・数値以外の内訳項目は0として計算されることを確認するテストを書く
  - [ ] 🟢 Task2の関数内で不正値を0に丸める

- [ ] Task 4: 月次余剰資金(賞与抜き)を計算する関数(仕様: requirements.md#余剰資金の計算-1、design.md#家計負担を反映した月次余剰資金を計算する処理)
  - [ ] 🔴 配偶者なしの場合は家計負担0として計算されることを確認するテストを書く
  - [ ] 🔴 配偶者ありの場合は入力された家計負担額がそのまま差し引かれることを確認するテストを書く
  - [ ] 🟢 算出関数を実装する

- [ ] Task 5: 年間余剰資金を計算する関数(仕様: requirements.md#余剰資金の計算-2)
  - [ ] 🔴 月次余剰資金×12にボーナス年間合計(回数×1回あたり金額)を足した値が返ることを確認するテストを書く
  - [ ] 🟢 算出関数を実装する

- [ ] Task 6: 支出割合を計算する関数(仕様: requirements.md#余剰資金の計算-4、design.md#支出割合を計算する処理)
  - [ ] 🔴 支出合計(個人支出の月合計+自分の家計負担額)を手取り月給で割った割合が返ることを確認するテストを書く
  - [ ] 🔴 手取り月給が0の場合は「算出対象なし」を表す値(例: null)が返ることを確認するテストを書く
  - [ ] 🟢 算出関数を実装する

- [ ] Task 7: 内訳リスト入力コンポーネント(仕様: requirements.md#個人支出-1、#個人支出-2、design.md#コンポーネント設計)
  - [ ] `app/life-money-sim/components/ExpenseListInput.tsx`を実装する(名称+金額ペアの追加・削除)
  - [ ] 画面の見た目の確認は実装後に`/run`スキルで実機確認する(純粋な表示・入力コンポーネントのためユニットテストは必須としない)

- [ ] Task 8: 内訳の円グラフコンポーネント(仕様: requirements.md#内訳の可視化、design.md#コンポーネント設計)
  - [ ] チャートライブラリを導入する(design.md#関連するファイル(抜粋)の推測箇所。導入時に`package.json`へ追加する)
  - [ ] `app/life-money-sim/components/ExpensePieChart.tsx`を実装する(内訳リストを渡すと各項目の比率で円グラフが描画されることを`/run`スキルで実機確認する。内訳0件時の表示崩れがないことも確認する)

- [ ] Task 9: 収入入力・家計負担入力コンポーネント(仕様: requirements.md#収入、#家計支出、design.md#コンポーネント設計)
  - [ ] `app/life-money-sim/components/IncomeForm.tsx`、`HouseholdShareInput.tsx`を実装する(配偶者なしの場合は家計支出セクションを表示しない)

- [ ] Task 10: 収支セクションの画面配線(仕様: design.md#画面設計、#状態管理)
  - [ ] `app/life-money-sim/page.tsx`の左カラム(PC)/前半セクション(スマホ)に収支セクションを実装し、Task1〜9の関数・コンポーネントを配線して`BalanceSummary.tsx`に結果(支出割合を含む)・`ExpensePieChart.tsx`を表示する
  - [ ] 収支セクションの入力状態を`asset-projection`セクションが参照できる形で親コンポーネントに保持する

## 修正: v0生成コードによるサマリーファースト・ダッシュボードUIへの刷新(2026-07)

- [x] Task 11: v0生成コードの取り込みに伴う既存コンポーネントの整形(仕様: design.md#関連するファイル(抜粋))
  - [x] `IncomeForm.tsx`・`HouseholdShareInput.tsx`から、`asset-projection/design.md#画面設計`で取り込んだ`AccordionSection.tsx`側に統合したカード枠・見出しを剥がし、フィールドのみを持つように整形する
  - [x] `BalanceSummary.tsx`をタイル型グリッドのレイアウトに変更する(個人支出月合計・家計支出合計を淡いグレー地タイル、支出割合をサンドイエローのバッジ、月次余剰資金を淡いティール地タイル、年間余剰資金を白地+枠線タイルで表示)

- [x] Task 12: 左カラム(アコーディオン群)・右カラム(結果ダッシュボード)への画面配線(仕様: design.md#画面設計)
  - [x] `page.tsx`で、収入・個人支出・家計支出の各アコーディオンを左カラムに、`BalanceSummary.tsx`の収支サマリーを右カラムの資産推移ダッシュボード(ヒーローカード・グラフ・テーブル)に続けて配置するよう配線し直す
  - [x] `/run`(run-benriyatoolスキル)で、PC幅(1280px)・モバイル幅(390px)双方で収支サマリーのタイルが崩れず表示されることを実機確認する

## 修正: 手取りボーナスの支給月入力化(2026-08)

- [x] Task 13: 収入型の支給月化(仕様: requirements.md#収入-2、asset-projection/design.md#関連するファイル(抜粋))
  - [x] `app/life-money-sim/lib/types.ts`の`IncomeInput.bonusCount: number`を`bonusMonths: number[]`(支給月・1〜12)に置き換える
  - [x] `saved-scenario`の復元(`fillMissingScenarioFields`)で、旧データの`bonusCount`しか持たない`income`にも`bonusMonths`を補って復元できるようにする(欠損時のフォールバック)

- [x] Task 14: 年間余剰資金の計算を支給月数ベースに(仕様: requirements.md#余剰資金の計算-2、design.md#年間収支をまとめる処理)
  - [x] 🔴 `calcAnnualSurplus`が「月次余剰資金×12 + 支給月の数×1回あたりの金額」になることを確認するテストに更新する
  - [x] 🟢 `page.tsx`側で支給月の数(`bonusMonths.length`)を`calcAnnualSurplus`へ渡して実装する

- [x] Task 15: 収入セクションの支給月入力UI(仕様: requirements.md#収入-2、design.md#画面設計)
  - [x] 🔴 `IncomeForm`のテストに、支給月(1〜12月)を選択でき、選択状態が`onChange`で親に伝わることを確認するケースを追加する
  - [x] 🟢 `IncomeForm.tsx`のボーナス回数入力を、支給月の複数選択UI(1〜12月のトグル)に置き換える。1回あたりの金額入力は維持する
  - [ ] `/run`(run-benriyatoolスキル)で、支給月を選ぶと収入サマリー・年間余剰資金・資産推移が更新されることを実機確認する
