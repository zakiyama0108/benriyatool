import { describe, it, expect } from 'vitest'
import { mapWithConcurrency } from '@/app/spotify-playlist/lib/mapWithConcurrency'

// 曲名の一括検索を「同時実行数を絞った小さなバッチ」で呼ぶための汎用ヘルパー(design.md#パフォーマンス)。
describe('同時実行数を絞った非同期マップ - レート制限を招かないよう並列数を制限する', () => {
  it('指定した並列数を超えて同時にworkerが走らないこと、かつ全要素が処理されること', async () => {
    const items = Array.from({ length: 12 }, (_, i) => i)
    let inFlight = 0
    let maxInFlight = 0
    const processed: number[] = []

    await mapWithConcurrency(items, 3, async (item) => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      processed.push(item)
      inFlight--
    })

    expect(maxInFlight).toBeLessThanOrEqual(3)
    expect(processed.sort((a, b) => a - b)).toEqual(items)
  })

  it('要素数が並列数より少なくても、要素数分だけ走って完了すること', async () => {
    const processed: number[] = []
    await mapWithConcurrency([1, 2], 10, (item) => {
      processed.push(item)
      return Promise.resolve()
    })
    expect(processed).toEqual([1, 2])
  })
})
