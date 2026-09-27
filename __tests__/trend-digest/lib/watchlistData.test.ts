import { describe, it, expect } from 'vitest'
import watchlistData from '../../../content/trend-digest/watchlist.json'
import criteriaData from '../../../content/trend-digest/criteria.json'
import type { WatchlistEntry, Criteria } from '../../../app/trend-digest/lib/watchlistTypes'
import { GENRE_ORDER } from '../../../app/trend-digest/lib/types'

const watchlist = watchlistData.genres as WatchlistEntry[]
const criteria = criteriaData as Criteria

const ALL_GENRES = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]

const FIXED_LIST_GENRES = [
  'music', 'japanese-movie', 'foreign-movie', 'japanese-drama', 'foreign-drama', 'anime', 'variety',
  'streaming-video', 'books-comics', 'buzzwords', 'games', 'travel',
]
const WEBSEARCH_GENRES = ['sns-buzz', 'gourmet', 'hobby', 'fashion', 'gadgets', 'economy-money', 'dev-trends']

// 仕様: specs/trend-digest/content-selection/requirements.md#グループとジャンル-1、specs/trend-digest/content-selection/requirements.md#グループとジャンル-2、specs/trend-digest/content-selection/requirements.md#機能要件-1
describe('対象ジャンルのデータ - 19ジャンルをエンタメ編(火曜配信・9ジャンル)とカルチャー・ライフスタイル編(金曜配信・10ジャンル)に固定リストで分ける', () => {
  it('ウォッチリストがGENRE_ORDERの19ジャンルと過不足なく一致すること(記載以外のジャンルをエージェントが自律的に追加しない固定リスト運用)', () => {
    const watchlistGenres = watchlist.map((e) => e.genre).sort()
    expect(watchlistGenres).toEqual([...ALL_GENRES].sort())
  })

  it('エンタメ編の9ジャンルが、requirements.mdに記載の並び・内容と一致すること', () => {
    const entertainmentGenres = watchlist.filter((e) => e.edition === 'entertainment').map((e) => e.genre)
    expect(entertainmentGenres).toEqual(GENRE_ORDER.entertainment)
  })

  it('カルチャー・ライフスタイル編の10ジャンルが、requirements.mdに記載の並び・内容と一致すること(dev-trendsを含む)', () => {
    const cultureGenres = watchlist.filter((e) => e.edition === 'culture-lifestyle').map((e) => e.genre)
    expect(cultureGenres).toEqual(GENRE_ORDER['culture-lifestyle'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-2、specs/trend-digest/content-selection/requirements.md#選定方式-3
describe('ジャンルの選定方式データ - 固定リストジャンル(12)とWebSearchジャンル(7)がrequirements.mdの記載と一致する', () => {
  it('固定リストジャンル(method: fixed-list)がrequirements.mdに記載の12ジャンルと一致すること', () => {
    const actual = watchlist.filter((e) => e.method === 'fixed-list').map((e) => e.genre).sort()
    expect(actual).toEqual([...FIXED_LIST_GENRES].sort())
  })

  it('WebSearchジャンル(method: websearch)がrequirements.mdに記載の7ジャンルと一致すること', () => {
    const actual = watchlist.filter((e) => e.method === 'websearch').map((e) => e.genre).sort()
    expect(actual).toEqual([...WEBSEARCH_GENRES].sort())
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-5
describe('SNSバズりの情報源 - 各社公式APIが有料のため直接利用せず、バズりを報じるメディア記事・口コミの広がりをWebSearchで収集する', () => {
  it('sns-buzzはWebSearchジャンルで、固定の情報源(公式APIの直接利用)を持たないこと', () => {
    const snsBuzz = watchlist.find((e) => e.genre === 'sns-buzz')
    expect(snsBuzz?.method).toBe('websearch')
    expect(snsBuzz?.sources).toEqual([])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-6
describe('グルメの情報源 - 食べログ・Rettyの店舗ランキングAPIが有料プラン前提のため直接利用せず、独立した言及の広がりをWebSearchで収集する', () => {
  it('gourmetはWebSearchジャンルで、固定の情報源(有料APIの直接利用)を持たないこと', () => {
    const gourmet = watchlist.find((e) => e.genre === 'gourmet')
    expect(gourmet?.method).toBe('websearch')
    expect(gourmet?.sources).toEqual([])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-4
describe('ファッション・ガジェット家電の選定方式 - 実際の売上・視聴・検索行動の集計値を伴わないため、単一メディアの特集記事を客観データの代用にせずWebSearchジャンルとする', () => {
  it('fashion・gadgetsはWebSearchジャンルで、固定の情報源を持たないこと', () => {
    for (const genre of ['fashion', 'gadgets']) {
      const entry = watchlist.find((e) => e.genre === genre)
      expect(entry?.method).toBe('websearch')
      expect(entry?.sources).toEqual([])
    }
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-4、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-5、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-6、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-7、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-9、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-10
describe('WebSearchジャンルの検索の手がかり(searchHints)データ - ジャンルごとの検索観点がrequirements.mdの記載と対応する', () => {
  it('SNSバズりはX・TikTok・Instagram・Threadsについての検索の手がかりを持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'sns-buzz')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/X/)
    expect(hints).toMatch(/TikTok|Instagram|Threads/)
  })

  it('グルメは自然発生的な言及・口コミの増加についての検索の手がかりを持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'gourmet')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/口コミ|食トレンド/)
  })

  it('流行りの趣味は新しいホビー・レジャーについての検索の手がかりを持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'hobby')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/趣味|ホビー/)
  })

  it('ファッションはSNS・口コミで言及が増えているアイテムについての検索の手がかりを持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'fashion')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/SNS|口コミ/)
  })

  it('ガジェット・家電はSNS・口コミで言及が増えている製品についての検索の手がかりを持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'gadgets')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/SNS|口コミ/)
  })

  it('経済・お金は流行っている節約術・クーポンについての検索の手がかりを持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'economy-money')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/節約|クーポン/)
  })

  it('開発手法・開発サービスは開発の進め方・道具立ての変化についての検索の手がかりを持つこと(ai-dev-digestとの重複を避けるため個々のリリースではなく潮流を検索する)', () => {
    const entry = watchlist.find((e) => e.genre === 'dev-trends')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/開発/)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#データ取得方法-1、specs/trend-digest/content-selection/requirements.md#情報源の地域区分-1
describe('固定リストジャンルの情報源データ - 公式サイト・公開ページのみをhttps URLで登録し、各情報源に地域区分(region)を持たせる', () => {
  it('固定リストジャンルは1件以上の情報源を持ち、すべてhttps URL・format・regionを持つこと', () => {
    for (const genre of FIXED_LIST_GENRES) {
      const entry = watchlist.find((e) => e.genre === genre)
      expect(entry?.sources.length).toBeGreaterThan(0)
      for (const source of entry?.sources ?? []) {
        expect(source.url).toMatch(/^https:\/\//)
        expect(source.format).toBeDefined()
        expect(['japan', 'overseas']).toContain(source.region)
      }
    }
  })

  it('format: site-specific-htmlの情報源はすべてparserIdを持つこと', () => {
    for (const entry of watchlist) {
      for (const source of entry.sources) {
        if (source.format === 'site-specific-html') {
          expect(source.parserId).toBeTruthy()
        }
      }
    }
  })
})

// 仕様: specs/trend-digest/content-selection/design.md「データ設計(ウォッチリスト・採用基準)」
describe('採用基準データの構造 - source-reviewによる月次見直し後も常に成り立つべき妥当性', () => {
  it('newEntryLookbackWeeksが正の整数であること(requirements.md#機能要件-4)', () => {
    expect(Number.isInteger(criteria.newEntryLookbackWeeks)).toBe(true)
    expect(criteria.newEntryLookbackWeeks).toBeGreaterThan(0)
  })

  it('historyの各値(継続度・注目度の判定に使う日数・件数)が正の整数であること', () => {
    const history = criteria.history
    for (const value of Object.values(history)) {
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThan(0)
    }
  })

  it('genreCriteriaが全19ジャンル分のキーを持ち、各methodがwatchlist.json側のmethodと一致すること', () => {
    for (const entry of watchlist) {
      const genreCriteria = criteria.genreCriteria[entry.genre]
      expect(genreCriteria).toBeDefined()
      expect(genreCriteria.method).toBe(entry.method)
    }
    expect(Object.keys(criteria.genreCriteria).sort()).toEqual([...ALL_GENRES].sort())
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
