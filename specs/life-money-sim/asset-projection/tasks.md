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
