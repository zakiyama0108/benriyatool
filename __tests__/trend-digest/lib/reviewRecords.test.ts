import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { collectSkippedGenres } from '../../../app/trend-digest/lib/reviewRecords'

const FIXTURES_DIR = path.join(__dirname, '../fixtures/articles-valid')

// 仕様: specs/trend-digest/source-review/design.md「見直しの材料を集める処理」、
// specs/trend-digest/content-selection/requirements.md#情報源の健全性監視-1
describe('掲載見送りジャンルの集計 - GENRE_ORDER上のジャンルでtopicsに現れなかったものを抽出する', () => {
  it('集計期間内(sinceDate以降)の記事から、掲載されなかったジャンルが抽出されること', () => {
    const records = collectSkippedGenres(FIXTURES_DIR, '2026-09-01')
    const entertainmentRecords = records.filter((r) => r.date === '2026-09-15')
    // entertainment編はmusic・animeのみ掲載、残り7ジャンルは見送り扱いになる
    expect(entertainmentRecords).toHaveLength(7)
    expect(entertainmentRecords.every((r) => r.edition === 'entertainment')).toBe(true)
    expect(entertainmentRecords.some((r) => r.genre === 'music')).toBe(false)
    expect(entertainmentRecords.some((r) => r.genre === 'japanese-movie')).toBe(true)
  })

  it('掲載されたジャンル(music・anime・gourmet)は集計対象から除外されること', () => {
    const records = collectSkippedGenres(FIXTURES_DIR, '2026-09-01')
    expect(records.some((r) => r.date === '2026-09-15' && r.genre === 'anime')).toBe(false)
    expect(records.some((r) => r.date === '2026-09-08' && r.genre === 'gourmet')).toBe(false)
  })

  it('sinceDateより前の記事は集計対象から除外されること', () => {
    const records = collectSkippedGenres(FIXTURES_DIR, '2026-09-10')
    expect(records.some((r) => r.date === '2026-09-08')).toBe(false)
    expect(records.some((r) => r.date === '2026-09-15')).toBe(true)
  })

  it('記事データディレクトリが存在しない場合、空配列が返ること', () => {
    expect(collectSkippedGenres(path.join(__dirname, '../fixtures/does-not-exist'), '2026-01-01')).toEqual([])
  })
})
