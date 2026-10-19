import { describe, it, expect } from 'vitest'
import fixedSourcesData from '../../../content/future-digest/fixedSources.json'
import { parseFixedSources, loadFixedSources, getFixedSourcesForGenre, type FixedSourceEntry } from '../../../app/future-digest/lib/fixedSourceTypes'
import { loadGenres } from '../../../app/future-digest/lib/genres'

const VALID_GENRE_IDS = ['technology-ai', 'medical-health']

// 仕様: specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-1、specs/future-digest/content-selection/design.md「データ設計(固定情報源)」
describe('固定情報源の設定ファイル - genres.jsonの有効なジャンルidと紐付け、channelの形を検証する', () => {
  it('genres.jsonに存在しないgenreIdは例外になること', () => {
    expect(() =>
      parseFixedSources([{ genreId: 'not-a-genre', name: 'サンプル', channel: { type: 'feed', url: 'https://example.com/rss' } }], VALID_GENRE_IDS)
    ).toThrow(/genreId/)
  })

  it('channel.typeがfeed/site-specific-html以外は例外になること', () => {
    expect(() =>
      parseFixedSources([{ genreId: 'technology-ai', name: 'サンプル', channel: { type: 'official-page', url: 'https://example.com' } }], VALID_GENRE_IDS)
    ).toThrow(/channel\.type/)
  })

  it('site-specific-htmlでparserIdがない場合は例外になること', () => {
    expect(() =>
      parseFixedSources([{ genreId: 'technology-ai', name: 'サンプル', channel: { type: 'site-specific-html', url: 'https://example.com' } }], VALID_GENRE_IDS)
    ).toThrow(/parserId/)
  })

  it('feed形式はparserIdなしで正常にパースできること', () => {
    const entries = parseFixedSources([{ genreId: 'technology-ai', name: 'サンプル', channel: { type: 'feed', url: 'https://example.com/rss' } }], VALID_GENRE_IDS)
    expect(entries).toEqual<FixedSourceEntry[]>([{ genreId: 'technology-ai', name: 'サンプル', channel: { type: 'feed', url: 'https://example.com/rss' } }])
  })

  it('getFixedSourcesForGenreは対象ジャンルの情報源だけを記載順のまま返すこと', () => {
    const entries = parseFixedSources(
      [
        { genreId: 'technology-ai', name: 'A', channel: { type: 'feed', url: 'https://example.com/a' } },
        { genreId: 'medical-health', name: 'B', channel: { type: 'feed', url: 'https://example.com/b' } },
        { genreId: 'technology-ai', name: 'C', channel: { type: 'feed', url: 'https://example.com/c' } },
      ],
      VALID_GENRE_IDS
    )
    expect(getFixedSourcesForGenre(entries, 'technology-ai').map((e) => e.name)).toEqual(['A', 'C'])
  })

  it('固定情報源がないジャンルは空配列になること', () => {
    const entries = parseFixedSources([{ genreId: 'technology-ai', name: 'A', channel: { type: 'feed', url: 'https://example.com/a' } }], VALID_GENRE_IDS)
    expect(getFixedSourcesForGenre(entries, 'medical-health')).toEqual([])
  })
})

// 仕様: specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-2、specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-3、specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-4、specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-5
describe('固定情報源の実データ - requirements.mdの表と完全一致する13件であること', () => {
  const genreIds = new Set(loadGenres().map((g) => g.id))

  it('fixedSources.jsonの全13件のgenreIdがgenres.jsonの有効なidと一致すること', () => {
    const entries = loadFixedSources()
    expect(entries).toHaveLength(13)
    for (const entry of entries) {
      expect(genreIds.has(entry.genreId)).toBe(true)
    }
  })

  it('ジャンルごとの件数がrequirements.mdの表と一致すること', () => {
    const entries = loadFixedSources()
    const countsByGenre = new Map<string, number>()
    for (const e of entries) {
      countsByGenre.set(e.genreId, (countsByGenre.get(e.genreId) ?? 0) + 1)
    }
    expect(Object.fromEntries(countsByGenre)).toEqual({
      'technology-ai': 2,
      'medical-health': 2,
      'environment-energy': 2,
      'space-science': 2,
      geopolitics: 2,
      'economy-work': 2,
      'personal-interest': 1,
    })
  })

  it('AR・VR・社会・人口・暮らし・性・恋愛・その他には固定情報源がないこと(requirements.md#情報源(固定リスト)-3〜4)', () => {
    const entries = loadFixedSources()
    expect(getFixedSourcesForGenre(entries, 'society-population-life')).toEqual([])
    expect(getFixedSourcesForGenre(entries, 'sexuality-romance')).toEqual([])
    expect(getFixedSourcesForGenre(entries, 'other')).toEqual([])
  })

  it('生データ(fixedSources.json)がパースを通ること(例外にならないこと)', () => {
    expect(() => loadFixedSources()).not.toThrow()
    expect(fixedSourcesData).toHaveLength(13)
  })
})

const EXPECTED_NAMES_BY_GENRE: Record<string, string[]> = {
  'technology-ai': ['McKinsey Digital Insights', 'MIT Technology Review'],
  'medical-health': ['WHO Newsroom', 'AMED'],
  'environment-energy': ['IPCC News', '環境省報道発表'],
  'space-science': ['NASA News Releases', 'JAXAプレスリリース'],
  geopolitics: ['IISS Online Analysis', 'CFR Latest'],
  'economy-work': ['経済産業省ニュースリリース', 'リクルートワークス研究所'],
  'personal-interest': ['国立長寿医療研究センター お知らせ'],
}

// 仕様: specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-テクノロジー・AI、specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-医療・健康、specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-環境・エネルギー、specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-宇宙・科学、specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-地政学、specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-経済・働き方、specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-個人的注目分野(若返り)
describe('固定情報源の実データ - ジャンルごとの情報源名がrequirements.mdの表と完全一致すること', () => {
  const entries = loadFixedSources()

  for (const [genreId, expectedNames] of Object.entries(EXPECTED_NAMES_BY_GENRE)) {
    it(`「${genreId}」の固定情報源名が表と完全一致すること`, () => {
      expect(getFixedSourcesForGenre(entries, genreId).map((e) => e.name)).toEqual(expectedNames)
    })
  }
})
