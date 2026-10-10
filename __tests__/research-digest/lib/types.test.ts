import { describe, it, expect } from 'vitest'
import genresData from '../../../content/research-digest/genres.json'
import {
  GENRE_ORDER,
  GENRE_LABELS,
  IMPACT_LABELS,
  IMPACT_ORDER,
  COLLECTION_FAILURE_LABELS,
  EDITION_GENRES,
  EDITION_LABELS,
} from '../../../app/research-digest/lib/types'

// 仕様: specs/research-digest/article-detail/requirements.md#記事本文の表示-2
describe('ジャンル・影響度・収集失敗の表示ラベル - 画面に出す日本語の言葉と並び順の基準', () => {
  it('ジャンルの並び順が設定ファイルの記載順で、日本語ラベルが引けること', () => {
    expect(GENRE_ORDER).toEqual(genresData.map((g) => g.id))
    expect(GENRE_LABELS['medical-health']).toBe('医療・健康')
  })

  it('影響度は大→中→小の順で、それぞれ「大」「中」「小」と表示されること', () => {
    expect(IMPACT_ORDER).toEqual(['high', 'medium', 'low'])
    expect(IMPACT_LABELS).toEqual({ high: '大', medium: '中', low: '小' })
  })

  // 仕様: specs/research-digest/article-detail/requirements.md#記事本文の表示-4
  it('収集失敗の分類ごとに、読者向けの日本語の理由が引けること', () => {
    expect(COLLECTION_FAILURE_LABELS).toEqual({
      timeout: '調査が時間内に終わりませんでした',
      'invalid-format': '調査結果を正しく読み取れませんでした',
      other: '調査中にエラーが発生しました',
    })
  })
})

// 仕様: specs/research-digest/article-detail/design.md「前提: 記事データの形式」
describe('編(Edition)の定義 - genres.jsonのedition属性から編ごとのジャンルID配列・日本語ラベルを引ける', () => {
  it('EDITION_GENRESがからだ・くらし編5件・科学・社会編5件のジャンルID配列を返すこと', () => {
    expect(EDITION_GENRES['body-life']).toHaveLength(5)
    expect(EDITION_GENRES['science-society']).toHaveLength(5)
    expect(EDITION_GENRES['body-life']).toContain('medical-health')
    expect(EDITION_GENRES['science-society']).toContain('ai-it')
  })

  it('EDITION_LABELSが編ごとの日本語ラベルを返すこと', () => {
    expect(EDITION_LABELS).toEqual({ 'body-life': 'からだ・くらし編', 'science-society': '科学・社会編' })
  })
})
