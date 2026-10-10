import { describe, it, expect } from 'vitest'
import { buildFutureDigestSources } from '../../../../app/blog/lib/sourceDirectory/buildFutureDigestSources'
import type { GenreConfig } from '../../../../app/future-digest/lib/genres'

const genres: GenreConfig[] = [
  { id: 'technology-ai', label: 'テクノロジー・AI', description: 'テクノロジー・AI', active: true, lineExcluded: false },
  { id: 'personal-interest', label: '個人的注目分野', description: '運営者が指定したテーマの中から選ぶ', themes: ['AR・VR', '若返り'], active: true, lineExcluded: false },
  { id: 'retired-genre', label: '廃止済みジャンル', description: '廃止済み', active: false, lineExcluded: false },
]

// 仕様: specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-5
describe('future-digestの情報源一覧の表示行 - genres.jsonの有効なジャンルから、WebSearch固定・固定文言の採用基準で表示行を作る', () => {
  it('active: trueのジャンルのみが行になり、active: falseのジャンルは含まれないこと', () => {
    const rows = buildFutureDigestSources(genres)
    expect(rows.map((row) => row.genreLabel)).toEqual(['テクノロジー・AI', '個人的注目分野'])
  })

  // 仕様: specs/blog/source-directory/design.md#決定事項-future-digest/research-digestの選定方式・採用基準の表示
  it('いずれの行も選定方式がWebSearch固定であること', () => {
    const rows = buildFutureDigestSources(genres)
    for (const row of rows) {
      expect(row.methodLabel).toBe('WebSearch')
    }
  })

  it('個人的注目分野ジャンルは、themesが検索の手がかりに入ること', () => {
    const rows = buildFutureDigestSources(genres)
    const personalInterest = rows.find((row) => row.genreLabel === '個人的注目分野')!
    expect(personalInterest.searchHints).toEqual(['AR・VR', '若返り'])
  })

  it('themesを持たないジャンルは、descriptionが検索の手がかりに入ること', () => {
    const rows = buildFutureDigestSources(genres)
    const technologyAi = rows.find((row) => row.genreLabel === 'テクノロジー・AI')!
    expect(technologyAi.searchHints).toEqual(['テクノロジー・AI'])
  })
})
