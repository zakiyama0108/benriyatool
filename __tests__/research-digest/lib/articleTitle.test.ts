import { describe, it, expect } from 'vitest'
import { buildArticleTitle } from '../../../app/research-digest/lib/articleTitle'

// 仕様: specs/research-digest/content-generation/requirements.md#記事の構成-7
describe('記事タイトルの組み立て - 発行日から「週刊研究発見 YYYY年M月D日号」を作る(月・日はゼロ埋めしない)', () => {
  it('2026-10-05から「週刊研究発見 2026年10月5日号」が作られること', () => {
    expect(buildArticleTitle('2026-10-05')).toBe('週刊研究発見 2026年10月5日号')
  })

  it('2026-11-30から「週刊研究発見 2026年11月30日号」が作られること', () => {
    expect(buildArticleTitle('2026-11-30')).toBe('週刊研究発見 2026年11月30日号')
  })
})
