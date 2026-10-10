import { describe, it, expect } from 'vitest'
import { shouldSkipRetry } from '../../../app/research-digest/lib/shouldSkipRetry'
import type { Article } from '../../../app/research-digest/lib/types'

function makeArticle(date: string, edition: Article['edition'] = 'body-life'): Article {
  return { id: `${date}-${edition}`, edition, date, findings: [], emptyGenres: [] }
}

// 仕様: specs/research-digest/weekly-publish/requirements.md#利用上限への到達時の再実行-2
describe('再実行cronが同じ配信日・編の記事を二重に公開しないための冪等チェック', () => {
  it('指定した配信日・編と同じ記事が既にあればtrue(スキップしてよい)を返すこと', () => {
    const articles = [makeArticle('2026-09-28'), makeArticle('2026-10-05')]
    expect(shouldSkipRetry(articles, '2026-10-05', 'body-life')).toBe(true)
  })

  it('指定した配信日・編と同じ記事がなければfalse(再実行してよい)を返すこと', () => {
    const articles = [makeArticle('2026-09-28')]
    expect(shouldSkipRetry(articles, '2026-10-05', 'body-life')).toBe(false)
  })

  // 仕様: specs/research-digest/weekly-publish/design.md「決定事項」(記事ID・ファイル名の形式)
  it('同じdateでもeditionが違う記事は既存とみなさないこと(1日に2編が存在しうるため)', () => {
    const articles = [makeArticle('2026-10-10', 'body-life')]
    expect(shouldSkipRetry(articles, '2026-10-10', 'science-society')).toBe(false)
  })
})
