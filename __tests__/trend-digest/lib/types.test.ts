import { describe, it, expect } from 'vitest'
import { GENRE_ORDER, GENRE_LABELS, DURATION_LABELS, HEAT_LABELS } from '../../../app/trend-digest/lib/types'

// 仕様: specs/trend-digest/article-detail/design.md#前提: 記事データの形式(この機能が定義する共有スキーマ)
describe('ジャンルの日本語ラベル定義 - GENRE_ORDERに含まれる全ジャンルにGENRE_LABELSが過不足なく対応していること', () => {
  it('GENRE_ORDERのentertainment(9件)+culture-lifestyle(10件、dev-trendsを含む)=19件のジャンルすべてにGENRE_LABELSのラベルが存在すること', () => {
    const allGenres = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]
    expect(allGenres).toHaveLength(19)
    expect(GENRE_ORDER.entertainment).toHaveLength(9)
    expect(GENRE_ORDER['culture-lifestyle']).toHaveLength(10)
    expect(GENRE_ORDER['culture-lifestyle']).toContain('dev-trends')
    for (const genre of allGenres) {
      expect(GENRE_LABELS[genre]).toBeTruthy()
    }
  })

  it('GENRE_LABELSのキー数がGENRE_ORDERの全ジャンル数(19件)と一致すること(余分なラベルが存在しないこと)', () => {
    const allGenres = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]
    expect(Object.keys(GENRE_LABELS)).toHaveLength(allGenres.length)
  })
})

// 仕様: specs/trend-digest/article-detail/design.md#前提: 記事データの形式(この機能が定義する共有スキーマ)、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-13
describe('継続度ラベル・注目度ラベルの日本語表記定義 - trend-historyが判定する全段階にDURATION_LABELS・HEAT_LABELSが過不足なく対応していること', () => {
  it('継続度ラベルの4段階(流行前/注目され始め/話題/非常に話題)すべてにDURATION_LABELSの日本語表記が存在すること', () => {
    expect(Object.keys(DURATION_LABELS).sort()).toEqual(['emerging', 'highly-talked', 'pre-trend', 'talked'].sort())
    expect(DURATION_LABELS['pre-trend']).toBe('流行前')
    expect(DURATION_LABELS.emerging).toBe('注目され始め')
    expect(DURATION_LABELS.talked).toBe('話題')
    expect(DURATION_LABELS['highly-talked']).toBe('非常に話題')
  })

  it('注目度ラベルの3段階(高い/普通/低い)すべてにHEAT_LABELSの日本語表記が存在すること', () => {
    expect(Object.keys(HEAT_LABELS).sort()).toEqual(['high', 'low', 'normal'].sort())
    expect(HEAT_LABELS.high).toContain('高い')
    expect(HEAT_LABELS.normal).toContain('普通')
    expect(HEAT_LABELS.low).toContain('低い')
  })
})
