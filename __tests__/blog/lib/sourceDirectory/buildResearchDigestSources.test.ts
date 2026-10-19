import { describe, it, expect } from 'vitest'
import { buildResearchDigestSources } from '../../../../app/blog/lib/sourceDirectory/buildResearchDigestSources'
import type { GenreConfig } from '../../../../app/research-digest/lib/genres'

const genres: GenreConfig[] = [
  { id: 'medical-health', label: '医療・健康', description: '病気の予防・診断・治療に関わる研究', active: true },
  { id: 'retired-genre', label: '廃止済みジャンル', description: '廃止済み', active: false },
]

// 仕様: specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-5
describe('research-digestの情報源一覧の表示行 - genres.jsonの有効なジャンルから、WebSearch固定・固定文言の採用基準で表示行を作る', () => {
  it('active: trueのジャンルのみが行になり、active: falseのジャンルは含まれないこと', () => {
    const rows = buildResearchDigestSources(genres)
    expect(rows.map((row) => row.genreLabel)).toEqual(['医療・健康'])
  })

  // 仕様: specs/blog/source-directory/design.md#決定事項-future-digest/research-digestの選定方式・採用基準の表示
  it('行の選定方式がWebSearch固定で、descriptionが検索の手がかりに入ること', () => {
    const rows = buildResearchDigestSources(genres)
    expect(rows[0].methodLabel).toBe('WebSearch')
    expect(rows[0].searchHints).toEqual(['病気の予防・診断・治療に関わる研究'])
  })
})
