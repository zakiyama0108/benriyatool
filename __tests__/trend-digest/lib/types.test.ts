import { describe, it, expect } from 'vitest'
import { GENRE_ORDER, GENRE_LABELS } from '../../../app/trend-digest/lib/types'

// 仕様: specs/trend-digest/article-detail/design.md#前提: 記事データの形式(この機能が定義する共有スキーマ)
describe('ジャンルの日本語ラベル定義 - GENRE_ORDERに含まれる全ジャンルにGENRE_LABELSが過不足なく対応していること', () => {
  it('GENRE_ORDERのentertainment(9件)+culture-lifestyle(9件)=18件のジャンルすべてにGENRE_LABELSのラベルが存在すること', () => {
    const allGenres = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]
    expect(allGenres).toHaveLength(18)
    for (const genre of allGenres) {
      expect(GENRE_LABELS[genre]).toBeTruthy()
    }
  })

  it('GENRE_LABELSのキー数がGENRE_ORDERの全ジャンル数(18件)と一致すること(余分なラベルが存在しないこと)', () => {
    const allGenres = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]
    expect(Object.keys(GENRE_LABELS)).toHaveLength(allGenres.length)
  })
})
