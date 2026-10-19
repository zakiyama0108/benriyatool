import { describe, it, expect } from 'vitest'
import { buildNewsDigestSources } from '../../../../app/blog/lib/sourceDirectory/buildNewsDigestSources'
import type { WatchlistEntry, Criteria } from '../../../../app/news-digest/lib/watchlistTypes'

function makeCriteria(overrides: Partial<Criteria> = {}): Criteria {
  return {
    weeklyTopicCountMax: { general: 3, business: 2, kanagawa: 1, childcare: 1 },
    minCorroboratingSources: 2,
    ...overrides,
  }
}

const watchlist: WatchlistEntry[] = [
  { id: 'nhk-news-web', category: 'general', name: 'NHK NEWS WEB(政治・国際)', channels: [{ type: 'rss', feedUrl: 'https://www.nhk.or.jp/rss/news/cat4.xml' }] },
  { id: 'toyokeizai', category: 'business', name: '東洋経済オンライン', channels: [{ type: 'rss', feedUrl: 'https://news.yahoo.co.jp/rss/media/toyo/all.xml' }] },
  { id: 'kanagawa-pref', category: 'kanagawa', name: '神奈川県公式サイト(お知らせ)', channels: [{ type: 'official-page', url: 'https://www.pref.kanagawa.jp/news/index.html' }] },
  { id: 'cfa', category: 'childcare', name: 'こども家庭庁', channels: [{ type: 'official-page', url: 'https://www.cfa.go.jp/news' }] },
]

// 仕様: specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-5
describe('news-digestの情報源一覧の表示行 - watchlist.json・criteria.jsonを4カテゴリ(総合/経済・ビジネス/神奈川ローカル/育児)の表示行に変換する', () => {
  it('4カテゴリの行が、総合→経済・ビジネス→神奈川ローカル→育児の順で生成されること', () => {
    const rows = buildNewsDigestSources(watchlist, makeCriteria())
    expect(rows.map((row) => row.genreLabel)).toEqual(['総合', '経済・ビジネス', '神奈川ローカル', '育児'])
  })

  it('各カテゴリの行に、そのカテゴリの情報源の名前・URLが含まれること', () => {
    const rows = buildNewsDigestSources(watchlist, makeCriteria())
    const general = rows.find((row) => row.genreLabel === '総合')!
    expect(general.sources).toEqual([{ name: 'NHK NEWS WEB(政治・国際)', url: 'https://www.nhk.or.jp/rss/news/cat4.xml' }])
  })

  // 仕様: specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-4
  it('総合・経済・ビジネスの採用基準の文言に「2社以上の同時報道」の趣旨が含まれること', () => {
    const rows = buildNewsDigestSources(watchlist, makeCriteria({ minCorroboratingSources: 2 }))
    const general = rows.find((row) => row.genreLabel === '総合')!
    const business = rows.find((row) => row.genreLabel === '経済・ビジネス')!
    expect(general.criteriaText).toContain('2社以上')
    expect(business.criteriaText).toContain('2社以上')
  })

  it('神奈川ローカル・育児の採用基準の文言に「専用枠」の趣旨が含まれること', () => {
    const rows = buildNewsDigestSources(watchlist, makeCriteria())
    const kanagawa = rows.find((row) => row.genreLabel === '神奈川ローカル')!
    const childcare = rows.find((row) => row.genreLabel === '育児')!
    expect(kanagawa.criteriaText).toContain('専用枠')
    expect(childcare.criteriaText).toContain('専用枠')
  })
})
