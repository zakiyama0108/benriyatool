import { describe, it, expect } from 'vitest'
import { formatRange } from '../../../app/board-game-rules/lib/gameDisplay'

// 仕様: specs/board-game-rules/game-detail/design.md「分類情報を表示する処理」
describe('formatRange - 対応人数・プレイ時間の範囲表示を組み立てる', () => {
  it('下限・上限がともに登録されているとき「下限〜上限」を返すこと', () => {
    expect(formatRange(3, 4)).toBe('3〜4')
  })

  it('下限=上限のとき1つだけ返すこと', () => {
    expect(formatRange(4, 4)).toBe('4')
  })

  it('両方NULL(未登録)のときnullを返すこと', () => {
    expect(formatRange(null, null)).toBeNull()
  })

  it('片方だけ登録されているとき、その値だけを返すこと', () => {
    expect(formatRange(3, null)).toBe('3')
    expect(formatRange(null, 4)).toBe('4')
  })
})
