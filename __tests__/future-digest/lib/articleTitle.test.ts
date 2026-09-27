import { describe, it, expect } from 'vitest'
import { buildArticleTitle } from '../../../app/future-digest/lib/articleTitle'

// 仕様: specs/future-digest/content-generation/requirements.md#記事の構成-7
describe('buildArticleTitle - 発行日から「週刊未来予測 YYYY年M月D日号」の記事タイトルを導出する(月・日はゼロ埋めしない)', () => {
  it('2026-10-01から「週刊未来予測 2026年10月1日号」が作られること', () => {
    expect(buildArticleTitle('2026-10-01')).toBe('週刊未来予測 2026年10月1日号')
  })

  it('2026-12-24から「週刊未来予測 2026年12月24日号」が作られること', () => {
    expect(buildArticleTitle('2026-12-24')).toBe('週刊未来予測 2026年12月24日号')
  })
})
