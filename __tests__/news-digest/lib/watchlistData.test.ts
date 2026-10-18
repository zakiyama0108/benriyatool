import { describe, it, expect } from 'vitest'
import watchlistData from '../../../content/news-digest/watchlist.json'
import criteriaData from '../../../content/news-digest/criteria.json'
import type { WatchlistEntry, Criteria, CategoryId } from '../../../app/news-digest/lib/watchlistTypes'

const watchlist = watchlistData as WatchlistEntry[]
const criteria: Criteria = criteriaData

// requirements.md#情報源(固定リスト)-<カテゴリ名>の表セルをそのまま転記した期待値
const EXPECTED_NAMES_BY_CATEGORY: Record<CategoryId, string[]> = {
  general: [
    'NHK NEWS WEB(政治・国際)',
    '共同通信',
    '産経新聞',
    'ANN(テレビ朝日系)',
    'FNNプライムオンライン',
    '読売新聞',
    'TBS NEWS DIG Powered by JNN',
    '日テレNEWS NNN',
    '時事通信',
  ],
  business: ['東洋経済オンライン', 'ダイヤモンド・オンライン', 'BUSINESS INSIDER JAPAN', 'ロイター', '日経ビジネス電子版'],
  kanagawa: ['神奈川県公式サイト(お知らせ)', '神奈川新聞(カナロコ)', '川崎市公式サイト(お知らせ)', '横浜市公式サイト(記者発表)'],
  childcare: [
    'こども家庭庁',
    '厚生労働省(子育て支援関連)',
    'NHK生活情報(子育て)',
    '川崎市公式サイト(こども・子育て)',
    '横浜市公式サイト(こども青少年局)',
  ],
}

// 仕様: specs/news-digest/content-selection/requirements.md#カテゴリ-1
describe('選定対象カテゴリ - 総合・経済/ビジネス・神奈川ローカル・育児の4カテゴリに限定されること', () => {
  it('ウォッチリストに登場するカテゴリが、この4種類のみであること', () => {
    const categories = new Set(watchlist.map((entry) => entry.category))
    expect(categories).toEqual(new Set(['general', 'business', 'kanagawa', 'childcare']))
  })
})

// 仕様: specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-2
describe('情報源の固定リストのデータ - requirements.mdの表と完全一致する23件の固定リストであること', () => {
  it('ウォッチリストがちょうど23件であること(記載以外の発信者・組織をエージェントが自律的に追加しない固定リスト運用)', () => {
    expect(watchlist).toHaveLength(23)
  })
})

// 仕様: specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-2
// 共同通信・東洋経済オンライン・神奈川新聞(カナロコ)は、robots.txtで直接サイトへのアクセスが
// 禁止されているため、産経新聞・ANN(テレビ朝日系)・FNNプライムオンライン・ダイヤモンド・オンライン・
// BUSINESS INSIDER JAPANは採用基準[4]を満たす候補の母数を増やすため、いずれもYahoo!ニュースが
// 公式配信する媒体別RSSフィード経由の取得にしている(design.md「データ設計(情報源・採用基準)」参照)
const EXPECTED_YAHOO_RSS_CHANNEL: Record<string, string> = {
  'kyodo-news': 'https://news.yahoo.co.jp/rss/media/kyodonews/all.xml',
  sankei: 'https://news.yahoo.co.jp/rss/media/san/all.xml',
  ann: 'https://news.yahoo.co.jp/rss/media/ann/all.xml',
  fnnprime: 'https://news.yahoo.co.jp/rss/media/fnnprimev/all.xml',
  toyokeizai: 'https://news.yahoo.co.jp/rss/media/toyo/all.xml',
  diamond: 'https://news.yahoo.co.jp/rss/media/diamond/all.xml',
  businessinsider: 'https://news.yahoo.co.jp/rss/media/binsider/all.xml',
  kanaloco: 'https://news.yahoo.co.jp/rss/media/kana/all.xml',
}

describe('情報源の固定リストのデータ - 共同通信・産経新聞・ANN・FNNプライムオンライン・東洋経済オンライン・ダイヤモンド・オンライン・BUSINESS INSIDER JAPAN・神奈川新聞(カナロコ)はYahoo!ニュース公式RSS経由で取得すること', () => {
  for (const [id, feedUrl] of Object.entries(EXPECTED_YAHOO_RSS_CHANNEL)) {
    it(`「${id}」のchannelsがYahoo!ニュースのRSS(${feedUrl})のみであること`, () => {
      const entry = watchlist.find((e) => e.id === id)
      expect(entry?.channels).toEqual([{ type: 'rss', feedUrl }])
    })
  }
})

// 仕様: specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-2
// ロイター公式サイトの直接取得(id: reuters-japan-business)はrobots.txtで全ボットを禁止しており
// 無料の公式代替も存在しないため不採用のまま。ただし、Infoseekニュース配信社ページ経由
// (id: reuters)では取得できることを確認し、こちらを情報源として採用した
describe('情報源の固定リストのデータ - Reuters Japan(ビジネス)の直接サイト取得(reuters-japan-business)は情報源リストに含まれないこと', () => {
  it('reuters-japan-businessのidを持つ情報源が存在しないこと(Infoseek経由のreutersとは別)', () => {
    expect(watchlist.find((e) => e.id === 'reuters-japan-business')).toBeUndefined()
  })
})

// 仕様: specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-2
// 時事通信の直接サイト取得(id: jiji-press)は日付が本文になくURLのクエリ文字列に埋め込まれて
// いるため安定した抽出ができず不採用のまま。ただし、Infoseekニュース配信社ページ経由(id: jiji)
// では日付が本文に表示されており取得できることを確認し、こちらを情報源として採用した。
// 日本経済新聞本紙(電子版、id: nikkei)はJS描画のSPA構造で静的HTML取得では記事一覧・日付が
// 取得できず公式RSSも存在しないため、引き続き不採用(日経ビジネス電子版はRSSを持つ別媒体のため
// id: nikkei-businessとして別途採用している)
describe('情報源の固定リストのデータ - 時事通信・日本経済新聞(電子版)の直接サイト取得(jiji-press・nikkei)は情報源リストに含まれないこと', () => {
  it('jiji-press・nikkeiのidを持つ情報源が存在しないこと(Infoseek経由のjiji・日経ビジネスのnikkei-businessとは別)', () => {
    expect(watchlist.find((e) => e.id === 'jiji-press')).toBeUndefined()
    expect(watchlist.find((e) => e.id === 'nikkei')).toBeUndefined()
  })
})

// 仕様: specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-2
// 読売新聞・TBS NEWS DIG・日テレNEWS NNN・時事通信・ロイターは、各社公式サイトが直接アクセスを
// 禁止またはJS描画のSPA構造で取得できないため、Infoseekニュース配信社ページ(news.infoseek.co.jp)
// 経由のofficial-page取得にしている(design.md「データ設計(情報源・採用基準)」参照)
const EXPECTED_INFOSEEK_CHANNEL: Record<string, string> = {
  yomiuri: 'https://news.infoseek.co.jp/publisher/yomiuri/',
  'tbs-news-dig': 'https://news.infoseek.co.jp/publisher/tbs/',
  'ntv-news-nnn': 'https://news.infoseek.co.jp/publisher/ntv/',
  jiji: 'https://news.infoseek.co.jp/publisher/jiji/',
  reuters: 'https://news.infoseek.co.jp/publisher/reuters/',
}

describe('情報源の固定リストのデータ - 読売新聞・TBS NEWS DIG・日テレNEWS NNN・時事通信・ロイターはInfoseekニュース配信社ページ経由で取得すること', () => {
  for (const [id, url] of Object.entries(EXPECTED_INFOSEEK_CHANNEL)) {
    it(`「${id}」のchannelsがInfoseekニュース配信社ページ(${url})のみであること`, () => {
      const entry = watchlist.find((e) => e.id === id)
      expect(entry?.channels).toEqual([{ type: 'official-page', url }])
    })
  }
})

// 仕様: specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-2
// 日経ビジネス電子版・川崎市公式サイト・横浜市公式サイトは各社・各自治体の公式RSSフィードを
// 直接取得する
const EXPECTED_OFFICIAL_RSS_CHANNEL: Record<string, string> = {
  'nikkei-business': 'https://business.nikkei.com/rss/sns/nb.rdf',
  'kawasaki-city': 'https://www.city.kawasaki.jp/main/rss/rss_new.xml',
  'yokohama-city': 'https://www.city.yokohama.lg.jp/city-info/koho-kocho/press/rss_news.xml',
  'kawasaki-kodomo': 'https://www.city.kawasaki.jp/kodomo/rss/rss.xml',
  'yokohama-kodomo': 'https://www.city.yokohama.lg.jp/city-info/koho-kocho/press/kodomo/rss_news.xml',
}

describe('情報源の固定リストのデータ - 日経ビジネス電子版・川崎市公式サイト・横浜市公式サイトは各社・各自治体の公式RSSフィードを直接取得すること', () => {
  for (const [id, feedUrl] of Object.entries(EXPECTED_OFFICIAL_RSS_CHANNEL)) {
    it(`「${id}」のchannelsが公式RSS(${feedUrl})のみであること`, () => {
      const entry = watchlist.find((e) => e.id === id)
      expect(entry?.channels).toEqual([{ type: 'rss', feedUrl }])
    })
  }
})

const CATEGORY_LABELS: Record<CategoryId, string> = {
  general: '総合',
  business: '経済・ビジネス',
  kanagawa: '神奈川ローカル',
  childcare: '育児',
}

// 仕様: specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-総合、specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-経済・ビジネス、specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-神奈川ローカル、specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-育児
describe('情報源の固定リストのデータ - カテゴリごとの情報源名がrequirements.mdの表と完全一致すること', () => {
  for (const [category, expectedNames] of Object.entries(EXPECTED_NAMES_BY_CATEGORY) as [CategoryId, string[]][]) {
    const categoryLabel = CATEGORY_LABELS[category]
    it(`「${categoryLabel}」カテゴリの情報源名が${expectedNames.join('、')}と完全一致すること`, () => {
      const namesInCategory = watchlist.filter((entry) => entry.category === category).map((entry) => entry.name)
      expect(new Set(namesInCategory)).toEqual(new Set(expectedNames))
      expect(namesInCategory).toHaveLength(expectedNames.length)
    })
  }
})

// 仕様: specs/news-digest/content-selection/design.md#データ設計(情報源・採用基準)
// criteria.jsonの値はmonthly-reviewの月次見直しで運用実績を見て更新されることが前提のデータのため、
// 特定時点の値をtoEqualで固定せず、常に成り立つべき構造上の妥当性(範囲・符号)のみを検証する
describe('採用基準データの構造 - monthly-reviewによる更新後も常に成り立つべき妥当性', () => {
  it('weeklyTopicCountMaxが総合・経済/ビジネス・神奈川ローカル・育児の4キーを持ち、いずれも正の整数であること', () => {
    const { weeklyTopicCountMax } = criteria
    expect(new Set(Object.keys(weeklyTopicCountMax))).toEqual(new Set(['general', 'business', 'kanagawa', 'childcare']))
    for (const value of Object.values(weeklyTopicCountMax)) {
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThan(0)
    }
  })

  it('minCorroboratingSourcesが2以上の整数であること(単独メディアの誤報・偏向を避けるため。requirements.md#採用基準(カテゴリごとの定量判定)-4)', () => {
    expect(Number.isInteger(criteria.minCorroboratingSources)).toBe(true)
    expect(criteria.minCorroboratingSources).toBeGreaterThanOrEqual(2)
  })
})
