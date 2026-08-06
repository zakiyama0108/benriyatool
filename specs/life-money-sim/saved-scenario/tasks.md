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
- 内容: 未ログイン時に`ScenarioPanel`の代わりに`ScenarioLoginPrompt`を「この試算を送信する」ボタンの近くに表示する
- `/run`(run-benriyatoolスキル)で、未ログイン時にログイン誘導案内が表示され、ログイン後はマイシナリオパネルに切り替わることを実機確認する

## 修正: 上書き保存・ボタン文言の変更(2026-08)

## T9. マイグレーション追加分の適用(実装より先に単独PRで適用)
- 対象ファイル: `supabase/migrations/<タイムスタンプ>_add_update_policy_to_life_money_sim_saved_scenarios.sql`
- 内容: design.md#マイグレーション追加分-上書き保存のためのUPDATE権限のSQLをそのまま適用する(既存のテーブル作成マイグレーションは変更しない)
- 実機確認: design.md#マイグレーション追加分のT0追加分確認事項3点(本人のみUPDATE可、他人の行は不可、未ログインは不可)を確かめる

## T10. savedScenario.tsにupdateScenarioを追加(仕様: design.md#名前を付けて保存する処理)
- 対象ファイル: `app/life-money-sim/lib/savedScenario.ts`、`__tests__/life-money-sim/lib/savedScenario.test.ts`
- 内容:
  - 🔴 `updateScenario(id: string, inputState: ScenarioInputState): Promise<boolean>` — 対象IDの行を現在の入力値一式でUPDATEする。成功/失敗を戻り値で表す(`saveScenario`と同じ方針)ことを確認するテストを書く
  - 🟢 実装する

## T11. ScenarioPanelにアクティブなシナリオ対応の表示・確認ダイアログを追加(仕様: requirements.md#上書き保存-11〜13、design.md#名前を付けて保存する処理、design.md#画面設計)
- 対象ファイル: `app/life-money-sim/components/ScenarioPanel.tsx`、`__tests__/life-money-sim/components/ScenarioPanel.test.tsx`
- 内容:
  - props: `activeScenario: ScenarioRecord | null`を追加し、`onSave`は「上書き更新」「新規保存」を呼び出し元(page.tsx)で判定できるよう、実行種別を渡せる形にする(`onSave: (name: string) => Promise<boolean>`はそのままとし、上書き/新規の判定自体はpage.tsx側の状態(アクティブなシナリオID)を見て行う。呼び出し元の責務分担は実装時の判断に委ねる)【推測: props設計の詳細】
  - 🔴 アクティブなシナリオがある場合、名前欄の初期値がそのシナリオの名前になり、ボタン文言が「更新する」になることを確認するテストを書く
  - 🔴 「更新する」を押すと確認ダイアログ(`window.confirm`)が呼ばれ、確認した場合のみ更新処理が実行される、キャンセルした場合は何も実行されないことを確認するテストを書く
  - 🔴 アクティブなシナリオがある状態で名前欄を別の名前に変更すると、ボタン文言が「保存する」に戻り、確認ダイアログを出さずに新規保存されることを確認するテストを書く
  - 🟢 実装する

## T12. page.tsxへのアクティブなシナリオID配線(仕様: design.md#アクティブなシナリオを管理する処理)
- 対象ファイル: `app/life-money-sim/page.tsx`
- 内容:
  - アクティブなシナリオID(`string | null`)の状態を追加する
  - 自動読み込み・一覧からの読み込みで、読み込んだシナリオのIDをアクティブなシナリオIDに設定する
  - 保存操作時、アクティブなシナリオIDがあり対象の名前が一致する場合は`updateScenario`を、それ以外は従来どおり`saveScenario`を呼ぶ。新規保存が成功したら、作成したシナリオのIDをアクティブなシナリオIDに設定する
  - 削除操作で、削除した行がアクティブなシナリオIDと一致する場合はアクティブなシナリオIDを`null`に戻す
  - ログアウト時にアクティブなシナリオIDを`null`に戻す
- 関連: design.md#アクティブなシナリオを管理する処理、design.md#名前を付けて保存する処理、design.md#削除する処理

## T13. SaveButton・ScenarioLoginPromptの文言変更
- 対象ファイル: `app/life-money-sim/components/ScenarioLoginPrompt.tsx`、`__tests__/life-money-sim/components/ScenarioLoginPrompt.test.tsx`
- 内容: 案内文言中の「この試算を保存する」を「この試算を送信する」に更新する(`save-result/tasks.md`のTask 7と同一PRで行う)

## T14. 動作確認
- `npm run dev`でログインし、保存済みシナリオがある状態(自動読み込み後)で入力値を編集し、名前欄をそのままにして保存すると「更新する」ボタンになっており、押すと確認ダイアログが出て、確認後にそのシナリオが上書きされることを確認する(一覧の件数が増えないこと・リロード後も編集後の値が保持されることを確認する)
- 同じ状態から名前欄を新しい名前に変更して保存すると、確認ダイアログなしで新規シナリオが追加されることを確認する
- 一覧から別のシナリオを読み込むと、そのシナリオがアクティブになり、以後の保存がそのシナリオを上書き対象にすることを確認する
- アクティブなシナリオを削除すると、以後の保存が新規保存に戻ることを確認する
- 「この試算を送信する」ボタン・未ログイン時の案内文言が、新しい文言に変わっていることを確認する
