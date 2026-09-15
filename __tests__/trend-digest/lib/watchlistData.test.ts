import { describe, it, expect } from 'vitest'
import watchlistData from '../../../content/trend-digest/watchlist.json'
import criteriaData from '../../../content/trend-digest/criteria.json'
import type { WatchlistEntry, Criteria } from '../../../app/trend-digest/lib/watchlistTypes'
import { GENRE_ORDER } from '../../../app/trend-digest/lib/types'

const watchlist = watchlistData.genres as WatchlistEntry[]
const criteria = criteriaData as Criteria

const FIXED_LIST_GENRES = [
  'music', 'japanese-movie', 'foreign-movie', 'foreign-drama', 'anime', 'streaming-video', 'books-comics',
  'buzzwords', 'fashion', 'gadgets', 'games', 'travel',
]
const WEBSEARCH_GENRES = ['japanese-drama', 'variety', 'sns-buzz', 'gourmet', 'hobby', 'economy-money']

// 仕様: specs/trend-digest/content-selection/requirements.md#グループとジャンル-1、specs/trend-digest/content-selection/requirements.md#グループとジャンル-2、specs/trend-digest/content-selection/requirements.md#機能要件-1
describe('対象ジャンルのデータ - 18ジャンルをエンタメ編(火曜配信・9ジャンル)とカルチャー・ライフスタイル編(金曜配信・9ジャンル)に固定リストで分ける', () => {
  it('ウォッチリストがちょうど18件であること(記載以外のジャンルをエージェントが自律的に追加しない固定リスト運用)', () => {
    expect(watchlist).toHaveLength(18)
  })

  it('エンタメ編の9ジャンルが、requirements.mdに記載の並び・内容と一致すること', () => {
    const entertainmentGenres = watchlist.filter((e) => e.edition === 'entertainment').map((e) => e.genre)
    expect(entertainmentGenres).toEqual(GENRE_ORDER.entertainment)
  })

  it('カルチャー・ライフスタイル編の9ジャンルが、requirements.mdに記載の並び・内容と一致すること', () => {
    const cultureGenres = watchlist.filter((e) => e.edition === 'culture-lifestyle').map((e) => e.genre)
    expect(cultureGenres).toEqual(GENRE_ORDER['culture-lifestyle'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-2、specs/trend-digest/content-selection/requirements.md#選定方式-3
describe('ジャンルの選定方式データ - 固定リストジャンル(12)とWebSearchジャンル(6)がrequirements.mdの記載と一致する', () => {
  it('固定リストジャンル(method: fixed-list)がrequirements.mdに記載の12ジャンルと一致すること', () => {
    const actual = watchlist.filter((e) => e.method === 'fixed-list').map((e) => e.genre).sort()
    expect(actual).toEqual([...FIXED_LIST_GENRES].sort())
  })

  it('WebSearchジャンル(method: websearch)がrequirements.mdに記載の6ジャンルと一致すること', () => {
    const actual = watchlist.filter((e) => e.method === 'websearch').map((e) => e.genre).sort()
    expect(actual).toEqual([...WEBSEARCH_GENRES].sort())
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-4
describe('SNSバズりの情報源 - 各社公式APIが有料のため直接利用せず、バズりを報じるニュースメディアの記事(二次情報源)をWebSearchで収集する', () => {
  it('sns-buzzはWebSearchジャンルで、固定の情報源(公式APIの直接利用)を持たないこと', () => {
    const snsBuzz = watchlist.find((e) => e.genre === 'sns-buzz')
    expect(snsBuzz?.method).toBe('websearch')
    expect(snsBuzz?.sources).toEqual([])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-5
describe('グルメの情報源 - 食べログ・Rettyの店舗ランキングAPIが有料プラン前提のため直接利用せず、話題の店を紹介するニュースメディアの記事をWebSearchで収集する', () => {
  it('gourmetはWebSearchジャンルで、固定の情報源(有料APIの直接利用)を持たないこと', () => {
    const gourmet = watchlist.find((e) => e.genre === 'gourmet')
    expect(gourmet?.method).toBe('websearch')
    expect(gourmet?.sources).toEqual([])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-2、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-3、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-4、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-5、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-6
describe('WebSearchジャンルの検索の手がかり(searchHints)データ - ジャンルごとの検索観点がrequirements.mdの記載と対応する', () => {
  it('日本ドラマ・バラエティは視聴率・SNS反響についての検索の手がかりを持つこと', () => {
    for (const genre of ['japanese-drama', 'variety']) {
      const entry = watchlist.find((e) => e.genre === genre)
      expect(entry?.searchHints?.length).toBeGreaterThan(0)
    }
  })

  it('SNSバズりはX・TikTok・Instagram・Threadsについての検索の手がかりを持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'sns-buzz')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/X/)
    expect(hints).toMatch(/TikTok|Instagram|Threads/)
  })

  it('グルメは話題の飲食店・食トレンドについての検索の手がかりを持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'gourmet')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/飲食店|食トレンド/)
  })

  it('流行りの趣味は新しいホビー・レジャーについての検索の手がかりを持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'hobby')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/趣味|ホビー/)
  })

  it('経済・お金はNISA・家計投資についての検索の手がかりを持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'economy-money')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/NISA|家計|投資/)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#データ取得方法-1
describe('固定リストジャンルの情報源データ - 公式サイト・公開ページのみをhttps URLで登録する(非公式API・認証回避を持たない)', () => {
  it('固定リストジャンルは1件以上の情報源を持ち、すべてhttps URLであること', () => {
    for (const genre of FIXED_LIST_GENRES) {
      const entry = watchlist.find((e) => e.genre === genre)
      expect(entry?.sources.length).toBeGreaterThan(0)
      for (const source of entry?.sources ?? []) {
        expect(source.url).toMatch(/^https:\/\//)
      }
    }
  })
})

// 仕様: specs/trend-digest/content-selection/design.md「データ設計(ウォッチリスト・採用基準)」
describe('採用基準データの構造 - source-reviewによる月次見直し後も常に成り立つべき妥当性', () => {
  it('perGenreMax・perEditionMax・newEntryLookbackWeeksが正の整数であること(requirements.md#機能要件-4、requirements.md#機能要件-5)', () => {
    expect(Number.isInteger(criteria.perGenreMax)).toBe(true)
    expect(criteria.perGenreMax).toBeGreaterThan(0)
    expect(Number.isInteger(criteria.perEditionMax)).toBe(true)
    expect(criteria.perEditionMax).toBeGreaterThan(0)
    expect(Number.isInteger(criteria.newEntryLookbackWeeks)).toBe(true)
    expect(criteria.newEntryLookbackWeeks).toBeGreaterThan(0)
  })

  it('genreCriteriaが全18ジャンル分のキーを持ち、各methodがwatchlist.json側のmethodと一致すること', () => {
    for (const entry of watchlist) {
      const genreCriteria = criteria.genreCriteria[entry.genre]
      expect(genreCriteria).toBeDefined()
      expect(genreCriteria.method).toBe(entry.method)
    }
  })

  it('WebSearchジャンルのminIndependentSourcesが1以上の整数であること', () => {
    for (const genre of WEBSEARCH_GENRES) {
      const genreCriteria = criteria.genreCriteria[genre as keyof typeof criteria.genreCriteria]
      if (genreCriteria.method !== 'websearch') throw new Error(`${genre}はwebsearchジャンルではありません`)
      expect(Number.isInteger(genreCriteria.minIndependentSources)).toBe(true)
      expect(genreCriteria.minIndependentSources).toBeGreaterThanOrEqual(1)
    }
  })
})
