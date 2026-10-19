import { describe, it, expect } from 'vitest'
import { nextIssueNumber } from '../../../app/future-digest/lib/issue'
import type { Article, Edition } from '../../../app/future-digest/lib/types'

function makeArticle(issueNumber: number, edition: Edition = 'science-tech'): Article {
  return {
    id: `2026-0${issueNumber}-01-${edition}`,
    edition,
    date: `2026-0${issueNumber}-01`,
    issueNumber,
    predictions: [],
    emptySlots: [],
  }
}

// 仕様: specs/future-digest/content-selection/requirements.md#時間軸の切り替え-1、specs/future-digest/content-selection/requirements.md#時間軸の切り替え-2
describe('公開済み記事の回数から次の回数を決める(編ごとに独立してカウントする)', () => {
  it('対象編の記事が1件もない場合は1回目とすること', () => {
    expect(nextIssueNumber([], 'science-tech')).toBe(1)
  })

  it('対象編にissueNumberが1・2の記事があれば次は3回目になること', () => {
    expect(nextIssueNumber([makeArticle(1), makeArticle(2)], 'science-tech')).toBe(3)
  })

  it('issueNumberが飛んでいても最大値+1になること(利用上限への到達で打ち切られた回は記事ファイルがなく回数に数えられないため)', () => {
    expect(nextIssueNumber([makeArticle(1), makeArticle(4)], 'science-tech')).toBe(5)
  })

  it('もう一方の編の記事は数えず、対象編の記事だけで最大値+1を求めること', () => {
    const articles = [
      makeArticle(1, 'science-tech'),
      makeArticle(2, 'science-tech'),
      makeArticle(1, 'life-society'),
    ]
    expect(nextIssueNumber(articles, 'science-tech')).toBe(3)
    expect(nextIssueNumber(articles, 'life-society')).toBe(2)
  })
})
