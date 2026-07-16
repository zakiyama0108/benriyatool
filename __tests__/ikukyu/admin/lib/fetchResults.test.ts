import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildFilterParams, fetchResults } from '../../../../app/ikukyu/admin/lib/fetchResults'
import type { Filter } from '../../../../app/ikukyu/admin/lib/types'

// 仕様: specs/ikukyu/admin/requirements.md#絞り込み-1、specs/ikukyu/admin/requirements.md#絞り込み-2、specs/ikukyu/admin/requirements.md#テストデータの扱い-1、specs/ikukyu/admin/requirements.md#テストデータの扱い-2、specs/ikukyu/admin/requirements.md#表示の初期値・区切り-1
describe('【管理】一覧・集計の絞り込み条件の組み立て - 期間とテストデータの有無から取得条件を決める', () => {
  it('テストデータを含めない設定のとき、is_testがfalseのものだけを対象にする条件になること', () => {
    const filter: Filter = { fromDate: null, toDate: null, includeTest: false }
    const params = buildFilterParams(filter)
    expect(params.excludeTest).toBe(true)
  })

  it('テストデータを含める設定のとき、is_testで絞り込まない条件になること', () => {
    const filter: Filter = { fromDate: null, toDate: null, includeTest: true }
    const params = buildFilterParams(filter)
    expect(params.excludeTest).toBe(false)
  })

  it('期間が未指定のとき、保存日時での絞り込みをしない条件になること', () => {
    const filter: Filter = { fromDate: null, toDate: null, includeTest: false }
    const params = buildFilterParams(filter)
    expect(params.gte).toBeNull()
    expect(params.lte).toBeNull()
  })

  it('期間が指定されたとき、日本時間の開始日の始まり・終了日の終わりまでを含む条件になること', () => {
    const filter: Filter = { fromDate: '2026-07-01', toDate: '2026-07-31', includeTest: false }
    const params = buildFilterParams(filter)
    // 一覧表示がJSTのため、絞り込み境界もJST(+09:00)の一日境界に揃える
    expect(params.gte).toBe('2026-07-01T00:00:00.000+09:00')
    expect(params.lte).toBe('2026-07-31T23:59:59.999+09:00')
  })
})

// Supabaseクライアントのクエリビルダをモックする。メソッドチェーンで自身を返し、
// 最後にawaitされたときに state.orderResult を返す（テスト側で成功/失敗を差し替え可能）
const { fromMock, builder, state } = vi.hoisted(() => {
  const state = { orderResult: { data: [] as unknown, error: null as unknown } }
  const builder: Record<string, ReturnType<typeof vi.fn>> = {}
  const make = () => {
    builder.select = vi.fn(() => builder)
    builder.eq = vi.fn(() => builder)
    builder.gte = vi.fn(() => builder)
    builder.lte = vi.fn(() => builder)
    builder.order = vi.fn(() => Promise.resolve(state.orderResult))
    return builder
  }
  const fromMock = vi.fn(() => make())
  return { fromMock, builder, state }
})

vi.mock('../../../../app/lib/supabaseClient', () => ({
  supabase: { from: fromMock },
}))

beforeEach(() => {
  fromMock.mockClear()
  state.orderResult = { data: [], error: null }
})

// 仕様: specs/ikukyu/admin/requirements.md#一覧表示-2、specs/ikukyu/admin/requirements.md#絞り込み-1、specs/ikukyu/admin/requirements.md#絞り込み-2
describe('【管理】保存データの取得 - 絞り込み条件をSupabaseの取得呼び出しに反映する', () => {
  it('テストデータを除外する設定のとき、is_test=falseでの絞り込みを行い、保存日時の新しい順で取得すること', async () => {
    await fetchResults({ fromDate: null, toDate: null, includeTest: false })
    expect(fromMock).toHaveBeenCalledWith('ikukyu_results')
    expect(builder.eq).toHaveBeenCalledWith('is_test', false)
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('テストデータを含める設定のとき、is_testでの絞り込みを行わないこと', async () => {
    await fetchResults({ fromDate: null, toDate: null, includeTest: true })
    expect(builder.eq).not.toHaveBeenCalled()
  })

  it('期間が指定されたとき、保存日時の範囲でも絞り込むこと', async () => {
    await fetchResults({ fromDate: '2026-07-01', toDate: '2026-07-31', includeTest: true })
    expect(builder.gte).toHaveBeenCalledWith('created_at', '2026-07-01T00:00:00.000+09:00')
    expect(builder.lte).toHaveBeenCalledWith('created_at', '2026-07-31T23:59:59.999+09:00')
  })

  it('取得に失敗した(errorが返る)とき、例外を投げて呼び出し元に伝えること', async () => {
    state.orderResult = { data: null, error: { message: 'permission denied' } }
    await expect(fetchResults({ fromDate: null, toDate: null, includeTest: true })).rejects.toThrow()
  })
})
