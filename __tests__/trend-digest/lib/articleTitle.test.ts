import { describe, it, expect } from 'vitest'
import { buildArticleTitle } from '../../../app/trend-digest/lib/articleTitle'

// article-detail(記事詳細ページ)がこのタイトルを表示に使うため、記事詳細ページのspecの
// テストとして先行実装する。導出ルール自体の仕様上の根拠はcontent-generation側にある
// (design.md「前提: 記事データの形式」で参照している導出関数)
// 仕様: specs/trend-digest/content-generation/requirements.md#記事の構成-6、specs/trend-digest/content-generation/design.md#記事タイトルを導出する処理(決定的なコード)
describe('記事タイトルの導出 - edition・発行日から一意に決まる固定テンプレートでタイトルを生成する(エージェントに自由生成させない)', () => {
  it('edition=entertainment、日付2026-09-15から「週刊トレンド エンタメ編 2026年9月15日号」が生成されること(1桁月日はゼロ埋めしない)', () => {
    expect(buildArticleTitle('entertainment', '2026-09-15')).toBe('週刊トレンド エンタメ編 2026年9月15日号')
  })

  it('edition=culture-lifestyle、日付2026-09-08(2桁日)から「週刊トレンド カルチャー編 2026年9月8日号」が生成されること', () => {
    expect(buildArticleTitle('culture-lifestyle', '2026-09-08')).toBe('週刊トレンド カルチャー編 2026年9月8日号')
  })

  it('12月25日(2桁月日)から「2026年12月25日号」の形式でタイトルが生成されること', () => {
    expect(buildArticleTitle('entertainment', '2026-12-25')).toBe('週刊トレンド エンタメ編 2026年12月25日号')
  })
})
