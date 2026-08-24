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

- [ ] Task 4: 表示範囲の最終年月を決める関数(仕様: requirements.md#月次の資産推移-4、design.md#表示範囲の最終年月を決める処理)
  - [ ] 🔴 本人の生年月がある場合は70歳になる年月が返ることを確認するテストを書く
  - [ ] 🔴 本人の生年月が未入力の場合は開始年月の30年後が返ることを確認するテストを書く
  - [ ] 🟢 算出関数を実装する

- [ ] Task 5: 貯蓄のみモードの月次資産推移を積み上げる関数(仕様: requirements.md#貯蓄/運用シミュレーションの切り替え-1、design.md#貯蓄のみモードで月次資産額を積み上げる処理)
  - [ ] 🔴 開始資産額に各月の差引後余剰を順に積み上げた配列が返ることを確認するテストを書く(Task4で求めた表示範囲の月数分)
  - [ ] 🟢 積み上げ関数を実装する

- [ ] Task 6: 資産運用モードの月次資産推移を積み上げる関数(仕様: requirements.md#複利計算、design.md#資産運用モードで月次資産額を積み上げる処理)
  - [ ] 🔴 想定利回り(年率)を月利に換算し、前月資産額への運用益を加算したうえで差引後余剰を積み上げた配列が返ることを確認するテストを書く
  - [ ] 🔴 想定利回り0%の場合は貯蓄のみモードと同じ結果になることを確認するテストを書く
  - [ ] 🟢 積み上げ関数を実装する

- [ ] Task 7: 月次データを年次にまとめる関数(仕様: requirements.md#表示単位の切り替え-2、design.md#月次データを年次にまとめる処理)
  - [ ] 🔴 同じ年の月次データが1行にまとまり、年次余剰資金が12か月分の合計になることを確認するテストを書く
  - [ ] 🔴 開始年・最終年が年の途中からになる場合、その年にある月だけが対象になることを確認するテストを書く
  - [ ] 🔴 年末時点(またはその年の最終月)の年齢・資産額が代表値として採用されることを確認するテストを書く
  - [ ] 🟢 集計関数を実装する

- [ ] Task 8: 前提入力・家族生年月コンポーネント(仕様: requirements.md#前提入力、design.md#関連するファイル(抜粋))
  - [ ] `app/life-money-sim/components/StartingAssetForm.tsx`、`FamilyProfileForm.tsx`を実装する(配偶者・子どもの生年月は任意入力)

- [ ] Task 9: 賞与・イベント登録コンポーネント(仕様: requirements.md#賞与・イベントの登録)
  - [ ] `app/life-money-sim/components/EventListInput.tsx`を実装する(対象年月・名目・金額を指定して追加・削除)

- [ ] Task 10: モード切り替え・表示単位切り替えコンポーネント(仕様: requirements.md#貯蓄/運用シミュレーションの切り替え、requirements.md#表示単位の切り替え-1)
  - [ ] `app/life-money-sim/components/ModeToggle.tsx`を実装する(想定利回り入力は資産運用選択時のみ表示)
  - [ ] `app/life-money-sim/components/PeriodToggle.tsx`を実装する(月次/年次の切り替え)

- [ ] Task 11: 資産推移テーブルの表示(仕様: requirements.md#月次の資産推移、requirements.md#表示単位の切り替え-2、design.md#画面設計)
  - [ ] `app/life-money-sim/components/AssetProjectionTable.tsx`を実装する(月次表示: 年・月・家族の年齢・イベント名目・差引後余剰・資産推移累計額、年次表示: 年・家族の年齢・イベント名目・年次余剰資金・資産推移累計額を1行ずつ表示)

- [ ] Task 12: 資産推移グラフの表示(仕様: requirements.md#資産推移グラフ、design.md#表示単位を切り替える処理)
  - [ ] `app/life-money-sim/components/AssetProjectionChart.tsx`を実装する(選択中の表示単位と同じ粒度のデータ点で折れ線/エリアを描画することを`/run`スキルで実機確認する)

- [ ] Task 13: 資産推移セクションの画面配線(仕様: design.md#状態管理、#依存関係)
  - [ ] `app/life-money-sim/page.tsx`の右カラム(PC)/後半セクション(スマホ)に資産推移セクションを実装し、Task1〜12を配線する。`monthly-balance`セクションの入力状態(月次余剰資金)を参照して計算する

## 修正: 表示範囲の年数化・表示単位デフォルトの変更(2026-07)

- [x] Task 14: 表示範囲の最終年月を決める関数の変更(仕様: requirements.md#前提入力-6、requirements.md#前提入力-7、requirements.md#月次の資産推移-4、design.md#表示範囲の最終年月を決める処理)
  - [x] 🔴 `calcFinalYearMonth`の引数を「開始年月・表示年数」に変更し、本人の生年月の有無によらず開始年月+表示年数の同月が返ることを確認するテストに書き換える(Task4の70歳・30年フォールバックのテストは置き換える)
  - [x] 🔴 表示年数が0以下・未入力・数値でない場合は初期値30として計算されること、小数(例: 2.9年→2年)の場合は整数部分のみが使われることを確認するテストを書く(requirements.md#前提入力-7)
  - [x] 🔴 表示年数に0.5・0.9のような「切り捨てると1未満になる小数」が入力された場合、0年ではなく初期値30年として計算されることを確認する境界値テストを書く(requirements.md#前提入力-7)
  - [x] 🔴 表示年数がちょうど1(有効な最小値)の場合、フォールバックせずそのまま1年として計算されることを確認する境界値テストを書く(requirements.md#前提入力-7)
  - [x] 🟢 `calcFinalYearMonth`を新しいシグネチャで実装し直す

- [x] Task 15: 表示範囲(年数)の入力欄追加・画面配線(仕様: requirements.md#前提入力-6、requirements.md#前提入力-7、design.md#関連するファイル(抜粋))
  - [x] `app/life-money-sim/lib/types.ts`の`StartingAssetInput`に`displayYears: number`を追加する
  - [x] `app/life-money-sim/components/StartingAssetForm.tsx`に表示範囲(年数)の入力欄を追加する
  - [x] `app/life-money-sim/page.tsx`: `startingAssetInput`の初期値に`displayYears: 30`を追加し、`calcFinalYearMonth`の呼び出しを`familyProfile.selfBirthMonth`基準から`startingAssetInput.displayYears`基準に変更する
  - [x] `app/life-money-sim/lib/savedScenario.ts`の`fillMissingScenarioFields`が使う既定値(`startingAssetInput`)にも`displayYears: 30`を追加する(過去に保存されたシナリオに`displayYears`が無い場合の欠損補完)
  - [x] `/run`(run-benriyatoolスキル)で、入力欄の表示・値変更が資産推移テーブル/グラフの行数に反映されることを実機確認する

- [x] Task 16: 表示単位の初期値を年次表示に変更(仕様: requirements.md#表示単位の切り替え-4、design.md#表示単位を切り替える処理)
  - [x] `app/life-money-sim/page.tsx`の`periodUnit`初期状態を`'year'`に変更する
  - [x] `/run`(run-benriyatoolスキル)で、初回表示が年次表示になっていることを実機確認する

- [x] Task 17: マイシナリオへの反映確認(仕様: saved-scenario/requirements.md#保存-3)
  - [x] `displayYears`は`StartingAssetInput`経由で`ScenarioInputState`に自動的に含まれるため、DBスキーマ変更は不要。既存の保存・読み込みのテスト(savedScenario.test.ts)がそのまま通ることを確認する
  - [x] `saved-scenario/requirements.md#保存-3`の保存対象一覧の文言に表示範囲を追記する(3点セット更新の一環)

## 修正: 定期的な収入・支出の登録(2026-07)

- [x] Task 18: 型定義の追加(仕様: requirements.md#定期的な収入・支出の登録、design.md#関連するファイル(抜粋))
  - [x] `app/life-money-sim/lib/types.ts`に`RecurringEntryType`(`'income' | 'expense'`)と`RecurringEntry`(名目・金額・種別・開始月・終了月・頻度)を追加する
  - [x] `MonthlyProjectionRow`・`YearlyProjectionRow`に、定期項目の名目一覧を保持する`recurringLabels: RecurringLabel[]`(`{label: string; type: RecurringEntryType}`。design.mdのビジュアルトーン要件(定期収入=ティール文字/定期支出=コーラル文字)を満たすため種別を保持する)を追加する
  - [x] `ScenarioInputState`に`recurringEntries: RecurringEntry[]`を追加する

- [x] Task 19: 当月に該当する定期収入・支出を求める関数(仕様: requirements.md#定期的な収入・支出の登録-1〜5、requirements.md#定期項目の頻度の正規化-1、design.md#当月に該当する定期収入・支出を求める処理)
  - [x] 🔴 頻度が不正な値(0以下・未入力・数値でない・小数)の場合、整数部分への切り捨て後1未満なら初期値1(毎月)として判定されることを確認するテストを書く
  - [x] 🔴 開始月自身・頻度の倍数にあたる月・終了月ちょうどの月は該当し、頻度の倍数にあたらない月・終了月より後の月は該当しないことを確認する境界値テストを書く
  - [x] 🔴 開始月が終了月より後(逆転した指定)の場合、どの月にも該当しないことを確認するテストを書く
  - [x] 🔴 複数の登録が同じ月に該当する場合、種別ごとに金額が合算されることを確認するテストを書く(不正な金額は0として扱う)
  - [x] 🟢 `app/life-money-sim/lib/assetProjection.ts`に判定・集計関数を実装する

- [x] Task 20: 当月の差引後余剰を求める関数の拡張(仕様: requirements.md#月次の資産推移-2、design.md#当月の差引後余剰を求める処理)
  - [x] 🔴 `calcNetSurplus`に定期収入合計・定期支出合計を加えた結果が返ることを確認するテストに書き換える(既存の賞与・イベントのテストケースは維持する)
  - [x] 🟢 `calcNetSurplus`のシグネチャを拡張し実装し直す

- [x] Task 21: 月次積み上げ・年次集計への配線(仕様: design.md#月次データを年次にまとめる処理)
  - [x] 🔴 `buildMonthlyProjectionRows`に定期項目一覧を渡した場合、該当月の`netSurplus`・`recurringLabels`に反映されることを確認するテストを書く
  - [x] 🔴 `aggregateYearly`が各月の`recurringLabels`を年の行にまとめて集約することを確認するテストを書く
  - [x] 🟢 `buildMonthlyProjectionRows`・`aggregateYearly`を実装し直す

- [x] Task 22: 定期的な収入・支出登録コンポーネント(仕様: requirements.md#定期的な収入・支出の登録、design.md#画面設計)
  - [x] `app/life-money-sim/components/RecurringEntryListInput.tsx`を実装する(名目・金額・種別・開始月・終了月・頻度を指定して追加・削除)

- [x] Task 23: 資産推移テーブルの表示更新(仕様: design.md#画面設計、design.md#ビジュアルトーン)
  - [x] `app/life-money-sim/components/AssetProjectionTable.tsx`を更新し、`recurringLabels`をイベント名目と合わせて表示する。行のハイライト判定(サンドイエロー地)にも定期項目の有無を含める

- [x] Task 24: 資産推移セクションの画面配線(仕様: design.md#状態管理)
  - [x] `app/life-money-sim/page.tsx`に`recurringEntries`の状態を追加し、`RecurringEntryListInput`・`buildMonthlyProjectionRows`への配線を行う
  - [x] `/run`(run-benriyatoolスキル)で、定期収入・支出の登録が該当する月すべての資産推移に反映されることを実機確認する

- [x] Task 25: マイシナリオへの反映(仕様: saved-scenario/design.md#保存対象の入力値)
  - [x] `app/life-money-sim/lib/savedScenario.ts`の`fillMissingScenarioFields`が使う既定値に`recurringEntries: []`を追加する(過去に保存されたシナリオに`recurringEntries`が無い場合の欠損補完。`displayYears`追加時と同じ方針)
  - [x] `saved-scenario/design.md`の保存対象の入力値・依存関係の記載を更新する(design.md側は本タスク分解と合わせて更新済みのため、実装との整合確認のみ行う)

## 修正: v0生成コードによるサマリーファースト・ダッシュボードUIへの刷新(2026-07)

- [x] Task 26: v0生成コードの取り込み・整形(仕様: design.md#画面設計、design.md#関連するファイル(抜粋))
  - [x] v0候補A(サマリーファースト・常時ダッシュボード型)から`HeroCard.tsx`(表示範囲の最終年月時点の資産額・開始資産額との差分バッジ・ミニ推移グラフ)、`AccordionSection.tsx`(入力項目群の折りたたみ共通コンポーネント)、`SegmentedControl.tsx`(2〜3択トグルの共通コンポーネント)を取り込み、プロジェクトの型・スタイル規約に整形する
  - [x] `AssetProjectionTable.tsx`にヘッダー行・1列目のsticky化を追加する

- [x] Task 27: 左カラム(アコーディオン群)・右カラム(結果ダッシュボード)への画面配線(仕様: design.md#画面設計、design.md#状態管理)
  - [x] `page.tsx`を、前提入力・家族構成・貯蓄/運用切替・賞与イベント登録・定期収入支出登録の各アコーディオン(左カラム)と、ヒーローカード・表示切り替え(セグメントコントロール)・資産推移グラフ・資産推移テーブル(右カラム)の常時ダッシュボードに配線し直す
  - [x] `ModeToggle.tsx`(左カラムのアコーディオン内トグル)と右カラムのセグメントコントロールが同じ状態を共有することを配線する
  - [x] `/run`(run-benriyatoolスキル)で、PC幅(1280px)・モバイル幅(390px)双方でレイアウト崩れがないこと、アコーディオン⇔セグメントコントロールの状態共有が実際に動作することを実機確認する

## 修正: 資産推移テーブルへの金額表示(2026-08)

- [x] Task 28: 名目一覧の型に金額を追加(仕様: requirements.md#賞与・イベントの登録-3、requirements.md#賞与・イベントの登録-4、requirements.md#定期的な収入・支出の登録-6、design.md#関連するファイル(抜粋))
  - [x] `app/life-money-sim/lib/types.ts`の`MonthlyProjectionRow`/`YearlyProjectionRow`を変更する: `eventLabels: string[]`→`eventItems: {label: string; amount: number}[]`、`hasBonus: boolean`→`bonusAmount: number`(0は登録なし)、`RecurringLabel`に`amount: number`を追加する

- [x] Task 29: 月次積み上げ・年次集計の金額反映(仕様: requirements.md#賞与・イベントの登録-3、requirements.md#賞与・イベントの登録-4、requirements.md#定期的な収入・支出の登録-6、design.md#資産推移テーブルに金額を表示する処理、design.md#月次データを年次にまとめる処理)
  - [x] 🔴 `buildMonthlyProjectionRows`が各月の`eventItems`(名目+金額)・`bonusAmount`(賞与合計額)・`recurringLabels`(名目+種別+金額)を返すことを確認するテストに書き換える(既存のeventLabels/hasBonusを検証していたテストを置き換える)
  - [x] 🔴 `aggregateYearly`が、`eventItems`はその年の発生分をすべてそのまま集める(合算しない)こと、`recurringLabels`は名目・種別ごとにその年の該当月の金額を合計して1件にまとめること、`bonusAmount`はその年の該当月の合計額になることを確認するテストに書き換える
  - [x] 🟢 `buildMonthlyProjectionRows`・`aggregateYearly`を実装し直す

- [x] Task 30: 資産推移テーブルの金額表示(仕様: design.md#資産推移テーブルに金額を表示する処理)
  - [x] 🔴 `AssetProjectionTable`のコンポーネントテストを新規に書く(`__tests__/life-money-sim/components/AssetProjectionTable.test.tsx`): 賞与・イベント・定期項目それぞれについて、名目に加えて金額(万円)が表示されることを確認する
  - [x] 🟢 `AssetProjectionTable.tsx`(`EventCell`)を、名目の直後に金額を表示するよう実装し直す。色分け(賞与・定期収入=ティール文字、イベント・定期支出=コーラル文字)は維持する
  - [x] `/run`(run-benriyatoolスキル)で、賞与・イベント・定期的な収入支出を追加した直後にテーブルへ名目と金額が表示されることを実機確認する

## 修正: 資産推移グラフの横軸に本人年齢を表示(2026-08)

- [ ] Task 31: グラフの横軸ラベルへの年齢追加(仕様: requirements.md#資産推移グラフ-3、design.md#グラフの横軸ラベルに本人年齢を添える処理)
  - [ ] `AssetProjectionChart.tsx`のラベル生成を、`selfAge`が求まる場合は既存ラベルの末尾に`(nn歳)`を追加し、`undefined`の場合は既存ラベルのまま表示するよう変更する(AssetProjectionChartはtasks.md Task12の判断によりユニットテスト対象外のため🔴/🟢は設けない)
  - [ ] `/run`(run-benriyatoolスキル)で、月次表示・年次表示それぞれの横軸ラベルに本人年齢が表示されること、本人の生年月が未入力の場合は年齢が表示されないことを実機確認する

## 修正: 通常ボーナスの支給月反映と運用益カラムの追加(2026-08)

- [x] Task 32: 行の型に運用益を追加(仕様: requirements.md#月次の資産推移-6、design.md#関連するファイル(抜粋))
  - [x] `app/life-money-sim/lib/types.ts`の`MonthlyProjectionRow`/`YearlyProjectionRow`に`investmentGain: number`(その月/その年の運用益・万円。貯蓄のみモードは0)を追加する

- [x] Task 33: 当月の通常ボーナスを差引後余剰に反映(仕様: requirements.md#月次の資産推移-2、requirements.md#月次の資産推移-5、design.md#当月の通常ボーナスを求める処理、design.md#当月の差引後余剰を求める処理)
  - [x] 🔴 対象年月の月が`monthly-balance`収入の支給月一覧に該当する場合は1回あたりの金額、非該当は0を返す関数(`calcRegularBonus`など)のテストを書く(毎年繰り返し該当すること・不正な金額は0扱いを含む)
  - [x] 🟢 `calcRegularBonus`を実装する
  - [x] 🔴 `buildMonthlyProjectionRows`が、支給月に該当する月の`bonusAmount`へ通常ボーナスと賞与登録の合算額を積み、差引後余剰にも反映することを確認するテストを追加する
  - [x] 🟢 `buildMonthlyProjectionRows`のシグネチャに支給月・1回あたり金額(または`IncomeInput`)を追加し、実装する

- [x] Task 34: 月次積み上げで運用益を算出(仕様: requirements.md#月次の資産推移-6、design.md#貯蓄のみモードで月次資産額を積み上げる処理、design.md#資産運用モードで月次資産額を積み上げる処理)
  - [x] 🔴 各月の運用益系列を求める関数(貯蓄のみは全月0、資産運用は前月末資産額×月利)のテストを書く
  - [x] 🟢 `buildGainSeries`を追加し(複利式は`buildInvestmentAssetSeries`と共通の月利換算`toMonthlyRate`を使う)、`buildMonthlyProjectionRows`が各行に`investmentGain`を持たせるようにする

- [x] Task 35: 年次集計に運用益・賞与合計を反映(仕様: requirements.md#表示単位の切り替え-2、design.md#月次データを年次にまとめる処理)
  - [x] 🔴 `aggregateYearly`が、その年の`investmentGain`を月次合計にすること、`bonusAmount`が通常ボーナス+賞与登録の年間合計になることを確認するテストを追加する
  - [x] 🟢 `aggregateYearly`を実装し直す

- [x] Task 36: 資産推移テーブルに運用益カラムを追加(仕様: requirements.md#月次の資産推移-6、design.md#資産推移テーブルに金額を表示する処理)
  - [x] 🔴 `AssetProjectionTable`のテストに、資産運用モードでは各行に運用益が表示され、貯蓄のみモードでは「−」表記になることを確認するケースを追加する
  - [x] 🟢 `AssetProjectionTable.tsx`に運用益列を追加する
  - [ ] `/run`(run-benriyatoolスキル)で、収入セクションのボーナス支給月・金額を設定すると該当月/年に賞与が表示・資産額に反映されること、資産運用モードで運用益カラムに値が出ることを実機確認する
