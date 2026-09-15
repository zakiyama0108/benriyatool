import { describe, it, expect } from 'vitest'
import watchlistData from '../../../content/news-digest/watchlist.json'
import criteriaData from '../../../content/news-digest/criteria.json'
import type { WatchlistEntry, Criteria, CategoryId } from '../../../app/news-digest/lib/watchlistTypes'

const watchlist = watchlistData as WatchlistEntry[]
const criteria: Criteria = criteriaData

// requirements.md#情報源(固定リスト)-<カテゴリ名>の表セルをそのまま転記した期待値
const EXPECTED_NAMES_BY_CATEGORY: Record<CategoryId, string[]> = {
  general: ['NHK NEWS WEB(政治・国際)', '共同通信', '時事通信'],
  business: ['日本経済新聞(電子版)', '東洋経済オンライン'],
  kanagawa: ['神奈川県公式サイト(お知らせ)', '神奈川新聞(カナロコ)'],
  childcare: ['こども家庭庁', '厚生労働省(子育て支援関連)', 'NHK生活情報(子育て)'],
}

// 仕様: specs/news-digest/content-selection/requirements.md#カテゴリ-1
describe('選定対象カテゴリ - 総合・経済/ビジネス・神奈川ローカル・育児の4カテゴリに限定されること', () => {
  it('ウォッチリストに登場するカテゴリが、この4種類のみであること', () => {
    const categories = new Set(watchlist.map((entry) => entry.category))
    expect(categories).toEqual(new Set(['general', 'business', 'kanagawa', 'childcare']))
  })
})

// 仕様: specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-2
describe('情報源の固定リストのデータ - requirements.mdの表と完全一致する10件の固定リストであること', () => {
  it('ウォッチリストがちょうど10件であること(記載以外の発信者・組織をエージェントが自律的に追加しない固定リスト運用)', () => {
    expect(watchlist).toHaveLength(10)
  })
})

// 仕様: specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-2
// 共同通信・東洋経済オンライン・神奈川新聞(カナロコ)は、robots.txtで直接サイトへのアクセスが
// 禁止されているため、Yahoo!ニュースが公式配信する媒体別RSSフィード経由の取得に切り替えている
// (design.md「データ設計(情報源・採用基準)」参照)
const EXPECTED_YAHOO_RSS_CHANNEL: Record<string, string> = {
  'kyodo-news': 'https://news.yahoo.co.jp/rss/media/kyodonews/all.xml',
  toyokeizai: 'https://news.yahoo.co.jp/rss/media/toyo/all.xml',
  kanaloco: 'https://news.yahoo.co.jp/rss/media/kana/all.xml',
}

describe('情報源の固定リストのデータ - 共同通信・東洋経済オンライン・神奈川新聞(カナロコ)はYahoo!ニュース公式RSS経由で取得すること', () => {
  for (const [id, feedUrl] of Object.entries(EXPECTED_YAHOO_RSS_CHANNEL)) {
    it(`「${id}」のchannelsがYahoo!ニュースのRSS(${feedUrl})のみであること`, () => {
      const entry = watchlist.find((e) => e.id === id)
      expect(entry?.channels).toEqual([{ type: 'rss', feedUrl }])
    })
  }
})

// 仕様: specs/news-digest/content-selection/requirements.md#情報源(固定リスト)-2
// (robots.txtで全ボットを禁止しており無料の公式代替も存在しないため削除)
describe('情報源の固定リストのデータ - Reuters Japan(ビジネス)は情報源リストに含まれないこと', () => {
  it('reuters-japan-businessのidを持つ情報源が存在しないこと', () => {
    expect(watchlist.find((e) => e.id === 'reuters-japan-business')).toBeUndefined()
  })
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
