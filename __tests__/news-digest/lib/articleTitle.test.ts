import { describe, it, expect } from 'vitest'
import { buildArticleTitle } from '../../../app/news-digest/lib/articleTitle'

// 仕様: specs/news-digest/content-generation/requirements.md#記事の構成-11、specs/news-digest/content-generation/design.md#記事タイトルを導出する処理
describe('記事タイトルの導出 - 日付(週の代表日)から固定テンプレートで記事タイトルを生成する', () => {
  it('日付から「YYYY年M月D日週の重要ニュース」形式のタイトルが生成されること', () => {
    expect(buildArticleTitle('2026-09-09')).toBe('2026年9月9日週の重要ニュース')
  })

  it('月・日が1桁の日付でも0埋めされないこと(2026-01-05→2026年1月5日週の重要ニュース)', () => {
    expect(buildArticleTitle('2026-01-05')).toBe('2026年1月5日週の重要ニュース')
  })
})
