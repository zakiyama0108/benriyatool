import { describe, it, expect } from 'vitest'
import { shouldSkipRetry } from '../../../app/future-digest/lib/shouldSkipRetry'
import type { Article, Edition } from '../../../app/future-digest/lib/types'

function makeArticle(date: string, edition: Edition = 'science-tech'): Article {
  return { id: `${date}-${edition}`, edition, date, issueNumber: 1, predictions: [], emptySlots: [] }
}

// 仕様: specs/future-digest/weekly-publish/requirements.md#利用上限への到達時の再実行-2
describe('再実行cronが同じ配信日・編の記事を二重に公開しないための冪等チェック', () => {
  it('指定した配信日・編と同じ記事が既にあればtrue(スキップしてよい)を返すこと', () => {
    const articles = [makeArticle('2026-09-24'), makeArticle('2026-10-01')]
    expect(shouldSkipRetry(articles, '2026-10-01', 'science-tech')).toBe(true)
  })

  it('指定した配信日・編と同じ記事がなければfalse(再実行してよい)を返すこと', () => {
    const articles = [makeArticle('2026-09-24')]
    expect(shouldSkipRetry(articles, '2026-10-01', 'science-tech')).toBe(false)
  })

  it('同じdateでもeditionが違う記事は既存とみなさず、false(再実行してよい)を返すこと', () => {
    const articles = [makeArticle('2026-10-04', 'life-society')]
    expect(shouldSkipRetry(articles, '2026-10-04', 'science-tech')).toBe(false)
  })
})
