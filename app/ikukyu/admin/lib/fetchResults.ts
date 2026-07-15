import { supabase } from '../../../lib/supabaseClient'
import type { AdminRecord, Filter } from './types'

// 絞り込み条件から、取得時に使うパラメータを組み立てる。
// 期間の終了日は「その日いっぱい」を含めたいので、その日の 23:59:59.999 までを対象にする。
// 日付境界はUTCで扱う（保存日時はtimestamptz。運営者の集計用途では日単位の近似で十分）
export type FilterParams = {
  excludeTest: boolean       // is_test=false だけに絞るか
  gte: string | null         // 保存日時の下限（ISO8601）。未指定はnull
  lte: string | null         // 保存日時の上限（ISO8601）。未指定はnull
}

export function buildFilterParams(filter: Filter): FilterParams {
  return {
    excludeTest: !filter.includeTest,
    gte: filter.fromDate ? `${filter.fromDate}T00:00:00.000Z` : null,
    lte: filter.toDate ? `${filter.toDate}T23:59:59.999Z` : null,
  }
}

// 絞り込み条件に一致する ikukyu_results を、保存日時の新しい順で取得する。
// 取得に失敗した場合は例外を投げ、呼び出し元（画面）でエラー表示に切り替えられるようにする
// （save-resultと異なり、管理画面では失敗を握りつぶさない: design.md#エラーハンドリング）
export async function fetchResults(filter: Filter): Promise<AdminRecord[]> {
  const params = buildFilterParams(filter)

  let query = supabase.from('ikukyu_results').select('*')
  if (params.excludeTest) query = query.eq('is_test', false)
  if (params.gte) query = query.gte('created_at', params.gte)
  if (params.lte) query = query.lte('created_at', params.lte)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw new Error(`ikukyu_resultsの取得に失敗しました: ${error.message}`)
  return (data ?? []) as AdminRecord[]
}
