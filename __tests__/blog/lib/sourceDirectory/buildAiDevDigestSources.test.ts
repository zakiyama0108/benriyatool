import { describe, it, expect } from 'vitest'
import { buildAiDevDigestSources } from '../../../../app/blog/lib/sourceDirectory/buildAiDevDigestSources'
import type { WatchlistEntry, Criteria } from '../../../../app/ai-dev-digest/lib/watchlistTypes'

function makeCriteria(overrides: Partial<Criteria> = {}): Criteria {
  return {
    dailyTopicCount: { min: 3, max: 5 },
    youtubeRecentVideoWindow: 10,
    youtubeCandidateVideoCount: 5,
    youtubeAboveAverageRatio: 1.2,
    qiitaMinLikes: 30,
    qiitaMaxAgeDays: 60,
    zennMinLikes: 30,
    minIndividualBlogBodyChars: 150,
    topicExcludeKeywords: [],
    duplicateSuppressionSourceTypes: [],
    ...overrides,
  }
}

const watchlist: WatchlistEntry[] = [
  {
    id: 'anthropic',
    category: 'official',
    name: 'Anthropic',
    channels: [{ type: 'youtube', channelId: '@anthropic-ai' }, { type: 'rss', feedUrl: 'https://www.anthropic.com/rss.xml' }],
  },
  {
    id: 'github',
    category: 'official',
    name: 'GitHub',
    channels: [{ type: 'rss', feedUrl: 'https://github.blog/feed/' }],
  },
  {
    id: 'karpathy',
    category: 'individual-youtube',
    name: 'Andrej Karpathy',
    channels: [{ type: 'youtube', channelId: '@AndrejKarpathy' }],
  },
  {
    id: 'simon-willison',
    category: 'individual-blog',
    name: 'Simon Willison',
    channels: [{ type: 'rss', feedUrl: 'https://simonwillison.net/atom/everything/' }],
  },
  {
    id: 'qiita',
    category: 'platform',
    name: 'Qiita',
    channels: [{ type: 'platform-qiita' }],
  },
  {
    id: 'zenn',
    category: 'platform',
    name: 'Zenn',
    channels: [{ type: 'platform-zenn' }],
  },
]

// 仕様: specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-5
describe('ai-dev-digestの情報源一覧の表示行 - watchlist.json・criteria.jsonを公式組織/個人YouTube/個人ブログ/Qiita/Zennの5グループに変換する', () => {
  it('5グループの行が、公式組織→個人YouTube→個人ブログ→Qiita→Zennの順で生成されること', () => {
    const rows = buildAiDevDigestSources(watchlist, makeCriteria())
    expect(rows.map((row) => row.genreLabel)).toEqual(['公式組織', '個人YouTube', '個人ブログ', 'Qiita', 'Zenn'])
  })

  // 仕様: specs/blog/source-directory/design.md#決定事項-情報源へのリンクURL
  it('公式組織の行に、そのカテゴリの情報源の名前・URL(RSSがあればRSS、なければYouTube)が含まれること', () => {
    const rows = buildAiDevDigestSources(watchlist, makeCriteria())
    const official = rows.find((row) => row.genreLabel === '公式組織')!
    expect(official.sources).toEqual([
      { name: 'Anthropic', url: 'https://www.anthropic.com/rss.xml' },
      { name: 'GitHub', url: 'https://github.blog/feed/' },
    ])
  })

  it('個人YouTubeの行のURLがチャンネルURL(https://www.youtube.com/<channelId>)になること', () => {
    const rows = buildAiDevDigestSources(watchlist, makeCriteria())
    const youtube = rows.find((row) => row.genreLabel === '個人YouTube')!
    expect(youtube.sources).toEqual([{ name: 'Andrej Karpathy', url: 'https://www.youtube.com/@AndrejKarpathy' }])
  })

  it('Qiita・Zennの行は、そのプラットフォームの代表URLを持つこと', () => {
    const rows = buildAiDevDigestSources(watchlist, makeCriteria())
    const qiita = rows.find((row) => row.genreLabel === 'Qiita')!
    const zenn = rows.find((row) => row.genreLabel === 'Zenn')!
    expect(qiita.sources).toEqual([{ name: 'Qiita', url: 'https://qiita.com/' }])
    expect(zenn.sources).toEqual([{ name: 'Zenn', url: 'https://zenn.dev/' }])
  })

  // 仕様: specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-4、specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-5
  it('各グループの採用基準の文言がcriteria.jsonの値から組み立てられること', () => {
    const rows = buildAiDevDigestSources(
      watchlist,
      makeCriteria({ youtubeCandidateVideoCount: 5, qiitaMaxAgeDays: 60, qiitaMinLikes: 30, zennMinLikes: 30, minIndividualBlogBodyChars: 150 })
    )
    const byLabel = Object.fromEntries(rows.map((row) => [row.genreLabel, row]))
    expect(byLabel['公式組織'].criteriaText).toContain('すべて')
    expect(byLabel['個人YouTube'].criteriaText).toContain('5本')
    expect(byLabel['個人ブログ'].criteriaText).toContain('150文字')
    expect(byLabel['Qiita'].criteriaText).toContain('60日')
    expect(byLabel['Qiita'].criteriaText).toContain('30')
    expect(byLabel['Zenn'].criteriaText).toContain('30')
  })

  it('編の区別を持たないため、どの行もeditionLabelを持たないこと', () => {
    const rows = buildAiDevDigestSources(watchlist, makeCriteria())
    for (const row of rows) {
      expect(row.editionLabel).toBeUndefined()
    }
  })
})
