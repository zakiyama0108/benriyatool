> TDDで進める。各タスクは 🔴 Red(失敗するテストを書く) → 🟢 Green(最小実装) → 🔵 Refactor の順で進める。

## T0. マイグレーション適用(実装より先に単独PRで適用)
- 対象ファイル: `supabase/migrations/<タイムスタンプ>_create_life_money_sim_saved_scenarios.sql`
- 内容: design.md#マイグレーション実装より先に単独PRで適用のSQLをそのまま適用する
- 実機確認: design.md#マイグレーション実装より先に単独PRで適用のT0確認事項3点(本人のみSELECT/INSERT/DELETE可、他人の行は不可、未ログインは不可)を確かめる

## T1. savedScenario.ts(一覧取得・保存・削除の純粋なSupabase呼び出し)
- 対象ファイル: `app/life-money-sim/lib/savedScenario.ts`、`__tests__/life-money-sim/lib/savedScenario.test.ts`
- 内容:
  - `fetchScenarios(): Promise<ScenarioRecord[]>` — ログイン中の本人のシナリオを保存日時の新しい順に取得する
  - `saveScenario(name: string, inputState: ScenarioInputState): Promise<boolean>` — 新規保存する。成功/失敗を戻り値で表す(`save-result`の`saveResult`と同じ方針)
  - `deleteScenario(id: string): Promise<boolean>` — 対象シナリオを削除する
  - Supabaseの`{error}`応答・例外どちらも失敗として扱う
- 関連: design.md#ログイン直後に保存済み一覧を取得し自動反映する処理、design.md#名前を付けて保存する処理、design.md#削除する処理

## T2. ScenarioInputState型と入力値のシリアライズ/デシリアライズ
- 対象ファイル: `app/life-money-sim/lib/types.ts`(型追加)、`__tests__/life-money-sim/lib/savedScenario.test.ts`
- 内容:
  - `ScenarioInputState`型を定義する(design.md#保存対象の入力値の8種類をまとめた型。`IncomeInput`・`PersonalExpenseInput`・`HouseholdExpenseInput`・`FamilyProfileInput`・`StartingAssetInput`・`BonusEntry[]`・`EventEntry[]`・`InvestmentModeInput`)
  - `input_state`(jsonb)との対応は素直な構造化オブジェクトとして扱い、特別な変換ロジックは持たない(そのままJSON化・パースできる形にする)
  - 読み込み時、`input_state`に現在の型が持つフィールドが欠けていた場合は、そのフィールドだけ現在の初期値を補って復元する関数を用意する(design.md#保存対象の入力値の将来のフィールド追加への対応)
- 関連: design.md#保存対象の入力値

## T3. ScenarioPanelコンポーネント(表示の出し分け・一覧・操作)
- 対象ファイル: `app/life-money-sim/components/ScenarioPanel.tsx`、`__tests__/life-money-sim/components/ScenarioPanel.test.tsx`
- 内容:
  - props: `scenarios: ScenarioRecord[]`, `onSave: (name: string) => void`, `onLoad: (id: string) => void`, `onDelete: (id: string) => void`
  - 名前入力欄+「保存する」ボタン。名前が空の場合は保存操作を無効にする(design.md#名前を付けて保存する処理-1)
  - 一覧を保存日時の新しい順に表示し、各行に「読み込む」「削除する」ボタンを表示する
  - 0件の場合はその旨が分かる表示にする
- 関連: design.md#マイシナリオ操作の表示を出し分ける処理、design.md#一覧を組み立てる処理、design.md#画面設計

## T4. page.tsxへの組み込み(ログイン連動の自動読み込み・保存対象状態の一括置き換え)
- 対象ファイル: `app/life-money-sim/page.tsx`
- 内容:
  - ログイン状態(`user-auth`のセッション)がある場合のみ`ScenarioPanel`を表示する
  - ログイン完了を検知したら`fetchScenarios`を呼び、1件以上あれば最も新しい1件の内容で全入力状態(income/personalExpense/household/familyProfile/startingAssetInput/bonuses/events/investmentModeInput)を置き換える。0件なら何もしない
  - 「読み込む」操作で選択したシナリオの内容に全入力状態を置き換える処理を実装する
  - 「保存する」操作で現在の全入力状態を`saveScenario`に渡す。「この試算を保存する」(save-result)とは独立して呼び出し、互いの成否に影響しない
  - 「削除する」操作で`deleteScenario`を呼び、成功時は一覧を再取得する
- 関連: design.md#ログイン直後に保存済み一覧を取得し自動反映する処理、design.md#読み込む処理、design.md#匿名保存save-resultとの独立性

## T5. 動作確認
- `npm run dev`でログインし、マイシナリオパネルが表示されることを確認する
- 名前を付けて保存 → 一覧に反映されることを確認する
- 複数件保存し、一覧から1件読み込むと入力値がすべて置き換わることを確認する
- 削除操作で一覧から消えることを確認する
- 一度ログアウトし再ログインすると、最も新しく保存したシナリオの内容が自動反映されることを確認する
- 未ログイン状態ではマイシナリオパネルが表示されず、既存の「この試算を保存する」ボタンの動作に影響がないことを確認する

## T6. プライバシーポリシー更新要否の確認
- `specs/legal/requirements.md`のプライバシーポリシー更新要否を確認する(requirements.md#依存関係)

## 修正: 未ログイン時のログイン誘導案内(2026-08)

## T7. ScenarioLoginPromptコンポーネント(仕様: requirements.md#マイシナリオの表示-2、design.md#マイシナリオ操作の表示を出し分ける処理)
- 対象ファイル: `app/life-money-sim/components/ScenarioLoginPrompt.tsx`、`__tests__/life-money-sim/components/ScenarioLoginPrompt.test.tsx`
- 内容:
  - 🔴 未ログイン時に表示される案内文言とログインボタンが表示され、押すとログイン開始(`onLoginClick`)が呼ばれることを確認するテストを書く
  - 🟢 コンポーネントを実装する(`LoginStatus.tsx`と同様、`onLoginClick`をpropsで受け取る)

## T8. page.tsxへの配線(仕様: design.md#マイシナリオ操作の表示を出し分ける処理)
- 対象ファイル: `app/life-money-sim/page.tsx`
- 内容: 未ログイン時に`ScenarioPanel`の代わりに`ScenarioLoginPrompt`を「この試算を保存する」ボタンの近くに表示する
- `/run`(run-benriyatoolスキル)で、未ログイン時にログイン誘導案内が表示され、ログイン後はマイシナリオパネルに切り替わることを実機確認する
