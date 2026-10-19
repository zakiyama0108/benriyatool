import { describe, it, expect } from 'vitest'
import fixedSourcesData from '../../../content/research-digest/fixedSources.json'
import { loadGenres } from '../../../app/research-digest/lib/genres'
import { parseFixedSources, loadFixedSources, type FixedSourceEntry } from '../../../app/research-digest/lib/fixedSourceTypes'

const VALID_GENRE_IDS = loadGenres().map((g) => g.id)

// 仕様: specs/research-digest/content-selection/requirements.md#情報源(固定リスト)-2、specs/research-digest/content-selection/design.md「データ設計(固定情報源)」
describe('固定情報源の設定ファイル - genres.jsonの有効なidに対応する固定情報源を設定ファイルで管理する', () => {
  it('fixedSources.jsonの全エントリーのgenreIdがgenres.jsonの有効なidと一致すること', () => {
    const entries = loadFixedSources()
    for (const entry of entries) {
      expect(VALID_GENRE_IDS).toContain(entry.genreId)
    }
  })

  it('genreIdごとの件数がrequirements.mdの記載どおり(ai-it・space-physics・materials-energy・education-parentingは2件、他の採用ジャンルは1件、睡眠・運動と経済・行動科学は0件)であること', () => {
    const entries = loadFixedSources()
    const countByGenre = (genreId: string) => entries.filter((e) => e.genreId === genreId).length
    expect(countByGenre('medical-health')).toBe(1)
    expect(countByGenre('nutrition-food')).toBe(1)
    expect(countByGenre('psychology-brain')).toBe(1)
    expect(countByGenre('sleep-exercise')).toBe(0)
    expect(countByGenre('environment-climate')).toBe(1)
    expect(countByGenre('ai-it')).toBe(2)
    expect(countByGenre('economics-behavioral')).toBe(0)
    expect(countByGenre('space-physics')).toBe(2)
    expect(countByGenre('materials-energy')).toBe(2)
    expect(countByGenre('education-parenting')).toBe(2)
  })

  it('記載順どおりにエントリーが返ること', () => {
    const entries = loadFixedSources()
    expect(entries.map((e) => e.name)).toEqual((fixedSourcesData as FixedSourceEntry[]).map((e) => e.name))
  })
})

describe('固定情報源の検証 - 不正な設定をビルド時に検知するため、channel.typeとgenreIdの形を検証する', () => {
  it('channel.typeがfeedの場合、urlが必須であること', () => {
    expect(() => parseFixedSources([{ genreId: 'medical-health', name: 'A', channel: { type: 'feed' } }], VALID_GENRE_IDS)).toThrow()
  })

  it('channel.typeがsite-specific-htmlの場合、urlとparserIdが必須であること', () => {
    expect(() =>
      parseFixedSources([{ genreId: 'medical-health', name: 'A', channel: { type: 'site-specific-html', url: 'https://example.com' } }], VALID_GENRE_IDS),
    ).toThrow()
  })

  it('channel.typeがfeed・site-specific-html以外の場合に例外になること', () => {
    expect(() =>
      parseFixedSources([{ genreId: 'medical-health', name: 'A', channel: { type: 'other', url: 'https://example.com' } }], VALID_GENRE_IDS),
    ).toThrow()
  })

  it('genreIdが有効なジャンルidに含まれない場合に例外になること', () => {
    expect(() =>
      parseFixedSources([{ genreId: 'not-a-genre', name: 'A', channel: { type: 'feed', url: 'https://example.com/feed' } }], VALID_GENRE_IDS),
    ).toThrow()
  })

  it('nameが空の場合に例外になること', () => {
    expect(() =>
      parseFixedSources([{ genreId: 'medical-health', name: '', channel: { type: 'feed', url: 'https://example.com/feed' } }], VALID_GENRE_IDS),
    ).toThrow()
  })

  it('正しい形式のエントリーは例外にならないこと', () => {
    expect(() =>
      parseFixedSources(
        [
          { genreId: 'medical-health', name: 'A', channel: { type: 'feed', url: 'https://example.com/feed' } },
          { genreId: 'medical-health', name: 'B', channel: { type: 'site-specific-html', url: 'https://example.com', parserId: 'exampleParser' } },
        ],
        VALID_GENRE_IDS,
      ),
    ).not.toThrow()
  })
})
