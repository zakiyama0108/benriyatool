import { describe, it, expect } from 'vitest'
import { buildArticleTitle } from '../../../app/future-digest/lib/articleTitle'

// 仕様: specs/future-digest/content-generation/requirements.md#記事の構成-7
describe('記事タイトルの組み立て - 発行日・編から「週刊未来予測 <編のラベル> YYYY年M月D日号」を導出する(月・日はゼロ埋めしない)', () => {
  it('science-techの場合、2026-10-01から「週刊未来予測 サイエンス・テクノロジー編 2026年10月1日号」が作られること', () => {
    expect(buildArticleTitle('2026-10-01', 'science-tech')).toBe('週刊未来予測 サイエンス・テクノロジー編 2026年10月1日号')
  })

  it('life-societyの場合、2026-10-04から「週刊未来予測 くらし・社会編 2026年10月4日号」が作られること', () => {
    expect(buildArticleTitle('2026-10-04', 'life-society')).toBe('週刊未来予測 くらし・社会編 2026年10月4日号')
  })

  it('2026-12-24から「週刊未来予測 サイエンス・テクノロジー編 2026年12月24日号」が作られること(月・日のゼロ埋め確認)', () => {
    expect(buildArticleTitle('2026-12-24', 'science-tech')).toBe('週刊未来予測 サイエンス・テクノロジー編 2026年12月24日号')
  })
})
