import { supabase } from '../../lib/supabaseClient'
import type { ScenarioInputState, ScenarioRecord } from './types'

// DB上のスネークケース行から画面で使うScenarioRecordへ変換する
type ScenarioRow = {
  id: string
  name: string
  input_state: ScenarioInputState
  created_at: string
}

function toScenarioRecord(row: ScenarioRow): ScenarioRecord {
  return { id: row.id, name: row.name, inputState: row.input_state, createdAt: row.created_at }
}

// ログイン中の本人のシナリオを保存日時の新しい順で取得する。
// 取得に失敗した場合は例外を投げ、呼び出し元(画面)で「一覧なし」扱いに倒す
// (design.md#エラーハンドリング。管理画面と異なりエラー表示はしない)
export async function fetchScenarios(): Promise<ScenarioRecord[]> {
  const { data, error } = await supabase
    .from('life_money_sim_saved_scenarios')
    .select('id, name, input_state, created_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`マイシナリオの取得に失敗しました: ${error.message}`)
  return ((data ?? []) as ScenarioRow[]).map(toScenarioRecord)
}

// 現在の入力値一式を、名前を付けてログイン中の本人のシナリオとして新規保存する。
// 成功/失敗を呼び出し元が判別できるよう真偽値で返す(design.md#名前を付けて保存する処理)
export async function saveScenario(name: string, inputState: ScenarioInputState): Promise<boolean> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return false

    const { error } = await supabase.from('life_money_sim_saved_scenarios').insert({
      user_id: userData.user.id,
      name,
      input_state: inputState,
    })
    return !error
  } catch {
    return false
  }
}

// アクティブなシナリオ(直前に読み込んだ、または保存したシナリオ)を、現在の入力値一式で上書き更新する。
// 名前は変更しない。成功/失敗を呼び出し元が判別できるよう真偽値で返す(saveScenarioと同じ方針)
// (design.md#名前を付けて保存する処理-4)
export async function updateScenario(id: string, inputState: ScenarioInputState): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('life_money_sim_saved_scenarios')
      .update({ input_state: inputState })
      .eq('id', id)
    return !error
  } catch {
    return false
  }
}

// 指定したシナリオを削除する。成功/失敗を呼び出し元が判別できるよう真偽値で返す
// (design.md#削除する処理)
export async function deleteScenario(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('life_money_sim_saved_scenarios').delete().eq('id', id)
    return !error
  } catch {
    return false
  }
}

// 保存済みの入力値に、現在の型が持つフィールドが欠けていた場合、そのフィールドだけ
// 現在の初期値で補って復元する(design.md#保存対象の入力値の将来のフィールド追加への対応)
export function fillMissingScenarioFields(
  stored: Partial<ScenarioInputState>,
  currentDefault: ScenarioInputState
): ScenarioInputState {
  return {
    income: stored.income ?? currentDefault.income,
    personalExpense: stored.personalExpense ?? currentDefault.personalExpense,
    household: stored.household ?? currentDefault.household,
    familyProfile: stored.familyProfile ?? currentDefault.familyProfile,
    // startingAssetInputはオブジェクト単位ではなくフィールド単位でマージする
    // (displayYears追加前に保存された旧データはstartingAssetInput自体は存在するがdisplayYearsだけ欠けているため)
    startingAssetInput: stored.startingAssetInput
      ? { ...currentDefault.startingAssetInput, ...stored.startingAssetInput }
      : currentDefault.startingAssetInput,
    bonuses: stored.bonuses ?? currentDefault.bonuses,
    events: stored.events ?? currentDefault.events,
    recurringEntries: stored.recurringEntries ?? currentDefault.recurringEntries,
    investmentModeInput: stored.investmentModeInput ?? currentDefault.investmentModeInput,
  }
}
