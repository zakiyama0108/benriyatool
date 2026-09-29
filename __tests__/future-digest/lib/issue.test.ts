import { describe, it, expect } from 'vitest'
import { nextIssueNumber } from '../../../app/future-digest/lib/issue'
import type { Article } from '../../../app/future-digest/lib/types'

function makeArticle(issueNumber: number): Article {
  return { id: `2026-0${issueNumber}-01`, date: `2026-0${issueNumber}-01`, issueNumber, predictions: [], emptySlots: [] }
}

// 仕様: specs/future-digest/content-selection/requirements.md#時間軸の切り替え-1、specs/future-digest/content-selection/requirements.md#時間軸の切り替え-2
describe('公開済み記事の回数から次の回数を決める', () => {
  it('記事が1件もない場合は1回目とすること', () => {
    expect(nextIssueNumber([])).toBe(1)
  })

  it('issueNumberが1・2の記事があれば次は3回目になること', () => {
    expect(nextIssueNumber([makeArticle(1), makeArticle(2)])).toBe(3)
  })

  it('issueNumberが飛んでいても最大値+1になること(利用上限への到達で打ち切られた回は記事ファイルがなく回数に数えられないため)', () => {
    expect(nextIssueNumber([makeArticle(1), makeArticle(4)])).toBe(5)
  })
})
