import { describe, it, expect } from 'vitest'
import watchlistData from '../../../content/trend-digest/watchlist.json'
import criteriaData from '../../../content/trend-digest/criteria.json'
import type { WatchlistEntry, Criteria } from '../../../app/trend-digest/lib/watchlistTypes'
import { GENRE_ORDER } from '../../../app/trend-digest/lib/types'

const watchlist = watchlistData.genres as WatchlistEntry[]
const criteria = criteriaData as Criteria

const ALL_GENRES = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]

const FIXED_LIST_GENRES = [
  'music', 'japanese-movie', 'foreign-movie', 'japanese-drama', 'foreign-drama', 'variety',
  'streaming-video', 'books-comics', 'buzzwords', 'games', 'travel',
]
// 流行りの趣味・ファッションは、2026-10次の情報源複数化(source-review)でも実際の消費・行動を
// 集計した構造化データの情報源が見つからなかったためWebSearchジャンルのまま(requirements.md#選定方式-4)
const WEBSEARCH_GENRES = ['hobby', 'fashion']
// アニメ(当初からの併用ジャンル)に加え、SNSバズり・グルメ・ガジェット・家電・経済・お金・
// 開発手法・開発サービスは、2026-10次の情報源複数化で実際の人気・アクセスを集計した構造化
// データの情報源が見つかったため、固定リスト+WebSearchを併用する併用ジャンルへ変更した
// (requirements.md#選定方式-7)
const HYBRID_GENRES = ['anime', 'sns-buzz', 'gourmet', 'gadgets', 'economy-money', 'dev-trends']

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

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-2、specs/trend-digest/content-selection/requirements.md#選定方式-3、specs/trend-digest/content-selection/requirements.md#選定方式-7、specs/trend-digest/content-selection/requirements.md#選定方式-8
describe('ジャンルの選定方式データ - 固定リストジャンル(11)・WebSearchジャンル(2)・併用ジャンル(6)がrequirements.mdの記載と一致する', () => {
  it('固定リストジャンル(method: fixed-list)がrequirements.mdに記載の11ジャンルと一致すること', () => {
    const actual = watchlist.filter((e) => e.method === 'fixed-list').map((e) => e.genre).sort()
    expect(actual).toEqual([...FIXED_LIST_GENRES].sort())
  })

  it('WebSearchジャンル(method: websearch)がrequirements.mdに記載の2ジャンルと一致すること', () => {
    const actual = watchlist.filter((e) => e.method === 'websearch').map((e) => e.genre).sort()
    expect(actual).toEqual([...WEBSEARCH_GENRES].sort())
  })

  it('併用ジャンル(method: hybrid)がrequirements.mdに記載の6ジャンルと一致すること(2026-10次の情報源複数化でアニメ以外にも拡大)', () => {
    const actual = watchlist.filter((e) => e.method === 'hybrid').map((e) => e.genre).sort()
    expect(actual).toEqual([...HYBRID_GENRES].sort())
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-5
describe('SNSバズりの情報源 - 各社公式APIが有料のため直接利用せず、Yahoo!リアルタイム検索(構造化データ)とバズりを報じるメディア記事・口コミの広がり(WebSearch)を併用する', () => {
  it('sns-buzzは併用ジャンルで、Yahoo!リアルタイム検索を固定の情報源に持つこと(X・Instagram・Threads・TikTok公式APIの直接利用はしない)', () => {
    const snsBuzz = watchlist.find((e) => e.genre === 'sns-buzz')
    expect(snsBuzz?.method).toBe('hybrid')
    expect(snsBuzz?.sources.length).toBeGreaterThan(0)
    expect(snsBuzz?.sources.some((s) => s.name.includes('Yahoo!リアルタイム検索'))).toBe(true)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-6
describe('グルメの情報源 - 食べログ・Rettyの店舗ランキングAPIが有料プラン前提のため直接利用せず、食べログの公開ランキングページ(構造化データ)とWebSearchを併用する', () => {
  it('gourmetは併用ジャンルで、食べログ人気ランキング(公開ページ)を固定の情報源に持つこと(有料APIの直接利用はしない)', () => {
    const gourmet = watchlist.find((e) => e.genre === 'gourmet')
    expect(gourmet?.method).toBe('hybrid')
    expect(gourmet?.sources.some((s) => s.name.includes('食べログ'))).toBe(true)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-4
describe('ファッション・ガジェット家電の選定方式 - ファッションは客観データの情報源が見つからずWebSearchジャンルのまま、ガジェット・家電は価格.comの構造化ランキングが見つかり併用ジャンルへ変更', () => {
  it('fashionはWebSearchジャンルで、固定の情報源を持たないこと', () => {
    const entry = watchlist.find((e) => e.genre === 'fashion')
    expect(entry?.method).toBe('websearch')
    expect(entry?.sources).toEqual([])
  })

  it('gadgetsは併用ジャンルで、価格.com家電カテゴリランキングを固定の情報源に持つこと', () => {
    const entry = watchlist.find((e) => e.genre === 'gadgets')
    expect(entry?.method).toBe('hybrid')
    expect(entry?.sources.some((s) => s.name.includes('価格.com'))).toBe(true)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-4、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-5、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-6、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-7、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-8、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-9、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-10、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-11
describe('WebSearchジャンル・併用ジャンルの検索の手がかり(searchHints)データ - ジャンルごとの検索観点がrequirements.mdの記載と対応する', () => {
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

  it('アニメ(併用ジャンルのWebSearch側)はSNS・口コミ・ニュースメディアでの言及増加についての検索の手がかりを持つこと(固定リスト側のランキングに現れない作品も拾うため)', () => {
    const entry = watchlist.find((e) => e.genre === 'anime')
    const hints = entry?.searchHints?.join(' ') ?? ''
    expect(hints).toMatch(/SNS/)
    expect(hints).toMatch(/ニュース/)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-3
describe('WebSearchジャンルの検索の手がかり(searchHints)データ - 単発ニュースではなく自然発生的な広がりを捉える表現にし、編集記事狙いの表現は使わない', () => {
  it('WebSearchジャンル・併用ジャンルのどのsearchHintsにも「紹介する記事」のような編集記事狙いの表現が含まれないこと', () => {
    const targets = watchlist.filter((e) => e.method === 'websearch' || e.method === 'hybrid')
    for (const entry of targets) {
      for (const hint of entry.searchHints ?? []) {
        expect(hint).not.toMatch(/紹介する記事/)
      }
    }
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-2
// 流行りの趣味・ファッションは2026-10の月次見直しで、候補0件が続いていた実績を踏まえ
// 既定(3件)より低い2件に調整済み(criteria.jsonでジャンルごとに調整可能。要件はこの個別調整を許容する)
const DEFAULT_MIN_INDEPENDENT_SOURCES_GENRES = WEBSEARCH_GENRES.filter((g) => !['hobby', 'fashion'].includes(g))
// 併用ジャンルのうちWebSearch側のminIndependentSourcesが既定(3件)より低い2件に調整されているもの
// (2026-10以前からの調整を引き継ぐgourmet・gadgets。他の併用ジャンルは既定の3件のまま)
const ADJUSTED_HYBRID_WEBSEARCH_GENRES = ['gourmet', 'gadgets']
describe('WebSearchジャンル・併用ジャンルの独立言及の最低件数(minIndependentSources)の既定値 - ニュース性の高い単発の話題を誤って採用しないよう既定で3件以上とする', () => {
  it('既定値を使うWebSearchジャンルのminIndependentSourcesが3件以上であること', () => {
    for (const genre of DEFAULT_MIN_INDEPENDENT_SOURCES_GENRES) {
      const genreCriteria = criteria.genreCriteria[genre as keyof typeof criteria.genreCriteria]
      if (genreCriteria.method !== 'websearch') throw new Error(`${genre}はwebsearchジャンルではありません`)
      expect(genreCriteria.minIndependentSources).toBeGreaterThanOrEqual(3)
    }
  })

  it('流行りの趣味・ファッションは、2026-10の月次見直しによりminIndependentSourcesが2件に調整されていること', () => {
    for (const genre of ['hobby', 'fashion']) {
      const genreCriteria = criteria.genreCriteria[genre as keyof typeof criteria.genreCriteria]
      if (genreCriteria.method !== 'websearch') throw new Error(`${genre}はwebsearchジャンルではありません`)
      expect(genreCriteria.minIndependentSources).toBe(2)
    }
  })

  it('グルメ・ガジェット家電(併用ジャンルのWebSearch側)は、2026-10の月次見直しによりminIndependentSourcesが2件に調整されていること', () => {
    for (const genre of ADJUSTED_HYBRID_WEBSEARCH_GENRES) {
      const genreCriteria = criteria.genreCriteria[genre as keyof typeof criteria.genreCriteria]
      if (genreCriteria.method !== 'hybrid') throw new Error(`${genre}はhybridジャンルではありません`)
      expect(genreCriteria.webSearch.minIndependentSources).toBe(2)
    }
  })

  it('それ以外の併用ジャンル(アニメ・SNSバズり・経済お金・開発手法)のWebSearch側のminIndependentSourcesが既定の3件以上であること', () => {
    for (const genre of HYBRID_GENRES.filter((g) => !ADJUSTED_HYBRID_WEBSEARCH_GENRES.includes(g))) {
      const genreCriteria = criteria.genreCriteria[genre as keyof typeof criteria.genreCriteria]
      if (genreCriteria.method !== 'hybrid') throw new Error(`${genre}はhybridジャンルではありません`)
      expect(genreCriteria.webSearch.minIndependentSources).toBeGreaterThanOrEqual(3)
    }
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-12
describe('地域枠(グルメ)のfocusAreas - 運営者フィードバックを受けた対象エリアがcriteria.jsonに設定されていること', () => {
  it('グルメ(併用ジャンルのWebSearch側)のfocusAreasが小田原・茅ヶ崎・横浜であること', () => {
    const genreCriteria = criteria.genreCriteria.gourmet
    if (genreCriteria.method !== 'hybrid') throw new Error('gourmetはhybridジャンルではありません')
    expect(genreCriteria.webSearch.focusAreas).toEqual(['小田原', '茅ヶ崎', '横浜'])
  })

  it('グルメ以外のWebSearchジャンルはfocusAreasを持たないこと', () => {
    for (const genre of WEBSEARCH_GENRES) {
      const genreCriteria = criteria.genreCriteria[genre as keyof typeof criteria.genreCriteria]
      if (genreCriteria.method !== 'websearch') throw new Error(`${genre}はwebsearchジャンルではありません`)
      expect(genreCriteria.focusAreas).toBeUndefined()
    }
  })

  it('グルメ以外の併用ジャンルのWebSearch側はfocusAreasを持たないこと', () => {
    for (const genre of HYBRID_GENRES.filter((g) => g !== 'gourmet')) {
      const genreCriteria = criteria.genreCriteria[genre as keyof typeof criteria.genreCriteria]
      if (genreCriteria.method !== 'hybrid') throw new Error(`${genre}はhybridジャンルではありません`)
      expect(genreCriteria.webSearch.focusAreas).toBeUndefined()
    }
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#データ取得方法-1、specs/trend-digest/content-selection/requirements.md#情報源の地域区分-1
describe('固定リストジャンルの情報源データ - 公式サイト・公開ページのみをhttps URLで登録し、各情報源に地域区分(region)を持たせる', () => {
  it('固定リストジャンル・併用ジャンルは1件以上の情報源を持ち、すべてhttps URL・format・regionを持つこと', () => {
    for (const genre of [...FIXED_LIST_GENRES, ...HYBRID_GENRES]) {
      const entry = watchlist.find((e) => e.genre === genre)
      expect(entry?.sources.length).toBeGreaterThan(0)
      for (const source of entry?.sources ?? []) {
        expect(source.url).toMatch(/^https:\/\//)
        expect(source.format).toBeDefined()
        expect(['japan', 'overseas']).toContain(source.region)
      }
    }
  })

  it('併用ジャンルは固定リスト側の情報源を1件以上持ち、WebSearch側の検索の手がかり(searchHints)も持つこと(いずれか一方の採用基準を満たせば候補にするOR条件のため)', () => {
    for (const genre of HYBRID_GENRES) {
      const entry = watchlist.find((e) => e.genre === genre)
      expect(entry?.sources.length).toBeGreaterThan(0)
      expect(entry?.searchHints?.length).toBeGreaterThan(0)
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

  it('format: structured-rss/structured-atomの情報源はparserIdを持たないこと(構造化データをそのまま取得するため専用パーサーを使わない)', () => {
    for (const entry of watchlist) {
      for (const source of entry.sources) {
        if (source.format === 'structured-rss' || source.format === 'structured-atom') {
          expect(source.parserId).toBeUndefined()
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

  it('併用ジャンルのfixedList・webSearchの各基準値が正の整数であること', () => {
    for (const genre of HYBRID_GENRES) {
      const genreCriteria = criteria.genreCriteria[genre as keyof typeof criteria.genreCriteria]
      if (genreCriteria.method !== 'hybrid') throw new Error(`${genre}はhybridジャンルではありません`)
      expect(Number.isInteger(genreCriteria.webSearch.minIndependentSources)).toBe(true)
      expect(genreCriteria.webSearch.minIndependentSources).toBeGreaterThanOrEqual(1)
      if (genreCriteria.fixedList.rankThreshold !== undefined) {
        expect(Number.isInteger(genreCriteria.fixedList.rankThreshold)).toBe(true)
        expect(genreCriteria.fixedList.rankThreshold).toBeGreaterThan(0)
      }
    }
  })
})
