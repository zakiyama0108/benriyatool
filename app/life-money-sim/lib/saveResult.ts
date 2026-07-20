import { supabase } from '../../lib/supabaseClient'
import type { SaveResultInput, ResultRecord } from './types'

// テスト・動作確認による保存かどうかを判定する。
// 開発サーバー(npm run dev)で動かしている場合と、URLにtest=1を付けて開いている場合(本番での動作確認用)にtrue
// (仕様: requirements.md#テストデータの判定-1〜3。ikukyu/save-result/design.md#テストデータかどうかを判定する処理と同一ロジック)
export function isTestData(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  return new URLSearchParams(window.location.search).get('test') === '1'
}

// 入力・計算結果からlife_money_sim_resultsテーブルのカラム定義どおりのレコードを組み立てる。
// 配偶者なしの場合は家計支出関連の項目を、貯蓄のみモードの場合は想定利回りをnullにする
// (仕様: requirements.md#機能要件-1、design.md#試算結果を保存する処理)
export function buildResultRecord(input: SaveResultInput, isTest: boolean): ResultRecord {
  return {
    has_spouse: input.hasSpouse,
    children_count: input.childrenCount,
    monthly_salary: input.monthlySalary,
    personal_expense_monthly: input.personalExpenseMonthly,
    household_expense_total: input.hasSpouse ? input.householdExpenseTotal : null,
    my_household_share: input.hasSpouse ? input.myHouseholdShare : null,
    starting_asset: input.startingAsset,
    investment_mode: input.investmentMode,
    expected_annual_rate: input.investmentMode ? input.expectedAnnualRate : null,
    event_count: input.eventCount,
    final_month_asset: input.finalMonthAsset,
    monthly_surplus: input.monthlySurplus,
    is_test: isTest,
  }
}

// 入力内容と計算結果をlife_money_sim_resultsテーブルへ保存する。
// 保存に失敗しても計算結果の表示自体は妨げないよう、エラーは外へ投げずに握りつぶす。
// 一方で呼び出し元(SaveButton)が成功/失敗に応じて表示を出し分けられるよう、真偽値で結果を返す
// (仕様: requirements.md#機能要件-1、requirements.md#エッジケース・例外処理-1、design.md#試算結果を保存する処理)
export async function saveResult(input: SaveResultInput): Promise<boolean> {
  try {
    const record = buildResultRecord(input, isTestData())
    const { error } = await supabase.from('life_money_sim_results').insert(record)
    return !error
  } catch {
    // 保存失敗時もユーザー操作をブロックしない(分析用のベストエフォート処理のため)
    return false
  }
}
