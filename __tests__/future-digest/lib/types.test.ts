import { describe, it, expect } from 'vitest'
import genresData from '../../../content/future-digest/genres.json'
import {
  horizonsForIssue,
  GENRE_ORDER,
  GENRE_LABELS,
  COLLECTION_FAILURE_LABELS,
} from '../../../app/future-digest/lib/types'
import type { GenreConfig } from '../../../app/future-digest/lib/genres'

// 仕様: specs/future-digest/article-detail/design.md「前提: 記事データの形式」、specs/future-digest/content-selection/requirements.md#時間軸の切り替え-1
describe('horizonsForIssue - 配信回数からその回が扱う時間軸2区分を決める', () => {
  it('奇数回(1回目)は近未来と長期未来になること', () => {
    expect(horizonsForIssue(1)).toEqual(['near', 'long'])
  })

  it('奇数回(3回目)も近未来と長期未来になること', () => {
    expect(horizonsForIssue(3)).toEqual(['near', 'long'])
  })

  it('偶数回(2回目)は中期未来と超長期未来になること', () => {
    expect(horizonsForIssue(2)).toEqual(['mid', 'ultra-long'])
  })

  it('偶数回(4回目)も中期未来と超長期未来になること', () => {
    expect(horizonsForIssue(4)).toEqual(['mid', 'ultra-long'])
  })

  it('0以下の回数は例外になること', () => {
    expect(() => horizonsForIssue(0)).toThrow()
    expect(() => horizonsForIssue(-1)).toThrow()
  })
})

// 仕様: specs/future-digest/article-detail/design.md「前提: 記事データの形式」
describe('GENRE_ORDER・GENRE_LABELS - genres.jsonの記載順・日本語ラベルをジャンル順の並べ替え・表示に使う', () => {
  it('GENRE_ORDERがgenres.jsonの記載順どおりであること', () => {
    expect(GENRE_ORDER).toEqual((genresData as GenreConfig[]).map((g) => g.id))
  })

  it('GENRE_LABELSでgenres.jsonのlabelが引けること', () => {
    for (const genre of genresData as GenreConfig[]) {
      expect(GENRE_LABELS[genre.id]).toBe(genre.label)
    }
  })
})

// 仕様: specs/future-digest/article-detail/design.md「前提: 記事データの形式」
describe('COLLECTION_FAILURE_LABELS - 収集失敗の分類ラベルを読者に分かる日本語文言に変換する', () => {
  it('timeoutは「調査が時間内に終わりませんでした」であること', () => {
    expect(COLLECTION_FAILURE_LABELS.timeout).toBe('調査が時間内に終わりませんでした')
  })

  it('invalid-formatは「調査結果を正しく読み取れませんでした」であること', () => {
    expect(COLLECTION_FAILURE_LABELS['invalid-format']).toBe('調査結果を正しく読み取れませんでした')
  })

  it('otherは「調査中にエラーが発生しました」であること', () => {
    expect(COLLECTION_FAILURE_LABELS.other).toBe('調査中にエラーが発生しました')
  })
})
