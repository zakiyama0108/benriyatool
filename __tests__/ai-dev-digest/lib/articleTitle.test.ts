import { describe, it, expect } from 'vitest'
import { buildArticleTitle } from '../../../app/ai-dev-digest/lib/articleTitle'

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#記事の構成-8、specs/ai-dev-digest/content-generation/design.md#記事タイトルを導出する処理(決定的なコード)
describe('記事タイトルの導出 - 日付から一意に決まる固定テンプレートでタイトルを生成する(エージェントに自由生成させない)', () => {
  it('2026-08-01から「2026年8月1日のAIニュース」が生成されること(1桁月日はゼロ埋めしない)', () => {
    expect(buildArticleTitle('2026-08-01')).toBe('2026年8月1日のAIニュース')
  })

  it('2026-12-25(2桁月日)から「2026年12月25日のAIニュース」が生成されること', () => {
    expect(buildArticleTitle('2026-12-25')).toBe('2026年12月25日のAIニュース')
  })
})
