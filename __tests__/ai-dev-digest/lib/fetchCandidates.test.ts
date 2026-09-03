import { describe, it, expect, vi } from 'vitest'
import {
  fetchYoutubeCandidates,
  fetchRssCandidates,
  fetchQiitaCandidates,
  fetchZennCandidates,
  fetchAllCandidates,
  buildSourceHealthLogLines,
} from '../../../app/ai-dev-digest/lib/fetchCandidates'
import type { HttpClient } from '../../../app/ai-dev-digest/lib/fetchCandidates'
import type { WatchlistEntry, Criteria } from '../../../app/ai-dev-digest/lib/watchlistTypes'

const criteria: Criteria = {
  dailyTopicCount: { min: 3, max: 5 },
  youtubeRecentVideoWindow: 2,
  youtubeCandidateVideoCount: 3,
  youtubeAboveAverageRatio: 1.2,
  qiitaMinLikes: 30,
  qiitaMaxAgeDays: 60,
  zennMinLikes: 30,
  minIndividualBlogBodyChars: 150,
  topicExcludeKeywords: [],
  duplicateSuppressionSourceTypes: ['individual-blog'],
}

function makeHttp(overrides: Partial<HttpClient> = {}): HttpClient {
  return {
    fetchJson: vi.fn().mockRejectedValue(new Error('未実装のURL')),
    fetchText: vi.fn().mockRejectedValue(new Error('未実装のURL')),
    ...overrides,
  }
}

const karpathy: WatchlistEntry = {
  id: 'karpathy',
  category: 'individual-youtube',
  name: 'Andrej Karpathy',
  channels: [{ type: 'youtube', channelId: '@AndrejKarpathy' }],
}

const anthropicYoutube: WatchlistEntry = {
  id: 'anthropic',
  category: 'official',
  name: 'Anthropic',
  channels: [{ type: 'youtube', channelId: '@anthropic-ai' }],
}

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#データ取得方法-1、specs/ai-dev-digest/content-selection/requirements.md#採用基準(種別ごとの定量判定)-5
describe('YouTube情報源からの候補収集 - 個人チャンネルは直近数本を候補にし、公式組織は最新1本のみを候補にする', () => {
  it('個人YouTubeチャンネルは直近3本すべてが候補になり、各候補が「候補群の直後2本の平均再生回数」を採用基準として持つこと', async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: 'UC_karpathy' }] }) // channels.list
      .mockResolvedValueOnce({
        items: [
          { id: { videoId: 'c1' }, snippet: { title: '候補1(最新)', publishedAt: '2026-08-05T00:00:00Z' } },
          { id: { videoId: 'c2' }, snippet: { title: '候補2', publishedAt: '2026-08-03T00:00:00Z' } },
          { id: { videoId: 'c3' }, snippet: { title: '候補3', publishedAt: '2026-08-01T00:00:00Z' } },
          { id: { videoId: 'p1' }, snippet: { title: '平均算出対象1', publishedAt: '2026-07-25T00:00:00Z' } },
          { id: { videoId: 'p2' }, snippet: { title: '平均算出対象2', publishedAt: '2026-07-20T00:00:00Z' } },
        ],
      }) // search.list
      .mockResolvedValueOnce({
        items: [
          { id: 'c1', statistics: { viewCount: '9000' } },
          { id: 'c2', statistics: { viewCount: '800' } },
          { id: 'c3', statistics: { viewCount: '1500' } },
          { id: 'p1', statistics: { viewCount: '1000' } },
          { id: 'p2', statistics: { viewCount: '2000' } },
        ],
      }) // videos.list

    const http = makeHttp({ fetchJson })
    const candidates = await fetchYoutubeCandidates(karpathy, 'dummy-api-key', criteria, http)

    expect(candidates.map((c) => c.heading)).toEqual(['候補1(最新)', '候補2', '候補3'])
    // 平均算出対象は候補群(3本)を除いた直後の2本: (1000 + 2000) / 2 = 1500
    expect(candidates.every((c) => c.recentAverageViews === 1500)).toBe(true)
    expect(candidates[0]).toMatchObject({ sourceType: 'individual-youtube', metricValue: 9000, url: 'https://www.youtube.com/watch?v=c1' })
  })

  it('平均算出対象の動画がチャンネルに存在しない(取得0本)とき、平均再生回数は0として扱われること', async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: 'UC_karpathy' }] })
      .mockResolvedValueOnce({
        items: [{ id: { videoId: 'only1' }, snippet: { title: '唯一の動画', publishedAt: '2026-08-05T00:00:00Z' } }],
      })
      .mockResolvedValueOnce({ items: [{ id: 'only1', statistics: { viewCount: '10' } }] })

    const http = makeHttp({ fetchJson })
    const candidates = await fetchYoutubeCandidates(karpathy, 'dummy-api-key', criteria, http)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].recentAverageViews).toBe(0)
  })

  it('公式組織のYouTubeは、直近複数本評価の対象外で最新1本のみが候補になること(平均再生回数は持たない)', async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: 'UC_anthropic' }] })
      .mockResolvedValueOnce({
        items: [
          { id: { videoId: 'a1' }, snippet: { title: '公式の最新動画', publishedAt: '2026-08-05T00:00:00Z' } },
          { id: { videoId: 'a2' }, snippet: { title: '公式の過去動画', publishedAt: '2026-08-01T00:00:00Z' } },
        ],
      })
      .mockResolvedValueOnce({ items: [{ id: 'a1', statistics: { viewCount: '3000' } }] })

    const http = makeHttp({ fetchJson })
    const candidates = await fetchYoutubeCandidates(anthropicYoutube, 'dummy-api-key', criteria, http)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({ sourceType: 'official', heading: '公式の最新動画' })
    expect(candidates[0].recentAverageViews).toBeUndefined()
  })

  it('チャンネルの動画取得(search.list)が失敗した場合、例外が呼び出し元に伝播すること(fetchAllCandidatesが個別に握りつぶす)', async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: 'UC_karpathy' }] })
      .mockRejectedValueOnce(new Error('YouTube API rate limit'))

    const http = makeHttp({ fetchJson })
    await expect(fetchYoutubeCandidates(karpathy, 'dummy-api-key', criteria, http)).rejects.toThrow()
  })
})

const anthropicBlog: WatchlistEntry = {
  id: 'anthropic',
  category: 'official',
  name: 'Anthropic',
  channels: [{ type: 'rss', feedUrl: 'https://www.anthropic.com/rss.xml' }],
}

const simonBlog: WatchlistEntry = {
  id: 'simon-willison',
  category: 'individual-blog',
  name: 'Simon Willison',
  channels: [{ type: 'rss', feedUrl: 'https://simonwillison.net/atom/everything/' }],
}

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#データ取得方法-1
describe('公式ブログ・個人ブログのRSS/Atomフィードからの候補収集 - フィードの新着記事をCandidate型に変換する', () => {
  it('RSS 2.0形式のフィードから新着記事をCandidateに変換すること', async () => {
    const rss = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title>新しいモデルを発表</title>
          <link>https://www.anthropic.com/news/example</link>
          <pubDate>Sat, 01 Aug 2026 00:00:00 GMT</pubDate>
        </item>
      </channel></rss>`
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(rss) })

    const { candidates } = await fetchRssCandidates(anthropicBlog, criteria, http)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      sourceId: 'anthropic',
      sourceName: 'Anthropic',
      sourceType: 'official',
      heading: '新しいモデルを発表',
      url: 'https://www.anthropic.com/news/example',
    })
  })

  it('Atom形式のフィード(individual-blog)から新着記事をCandidateに変換すること', async () => {
    const longBody = 'この記事ではLLMツールの新機能について詳しく解説する。'.repeat(8)
    const atom = `<?xml version="1.0"?>
      <feed>
        <entry>
          <title>LLMツールの新機能について</title>
          <link href="https://simonwillison.net/2026/Aug/1/example/" />
          <updated>2026-08-01T00:00:00Z</updated>
          <content type="html"><![CDATA[<p>${longBody}</p>]]></content>
        </entry>
      </feed>`
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(atom) })

    const { candidates } = await fetchRssCandidates(simonBlog, criteria, http)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      sourceType: 'individual-blog',
      heading: 'LLMツールの新機能について',
      url: 'https://simonwillison.net/2026/Aug/1/example/',
    })
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#採用基準(種別ごとの定量判定)-6
describe('個人ブログの本文量による除外 - 公式RSSの本文が短すぎる投稿は要約に足る情報がないため候補にしない', () => {
  const shortBody = '新しいポッドキャスト回を公開しました。'
  const longBody = 'この投稿では新しいツールの設計方針と使い方を具体例つきで詳しく解説している。'.repeat(6)

  function atomWithTwoPosts(): string {
    return `<?xml version="1.0"?>
      <feed>
        <entry>
          <title>ポッドキャスト回の告知</title>
          <link href="https://simonwillison.net/2026/Aug/2/podcast/" />
          <updated>2026-08-02T00:00:00Z</updated>
          <content type="html"><![CDATA[<p>${shortBody}</p>]]></content>
        </entry>
        <entry>
          <title>新しいツールの設計方針</title>
          <link href="https://simonwillison.net/2026/Aug/1/tool/" />
          <updated>2026-08-01T00:00:00Z</updated>
          <content type="html"><![CDATA[<p>${longBody}</p>]]></content>
        </entry>
      </feed>`
  }

  it('本文が閾値(150字)未満の個人ブログ投稿は候補に含まれず、閾値以上の投稿だけが候補になること', async () => {
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(atomWithTwoPosts()) })
    const { candidates } = await fetchRssCandidates(simonBlog, criteria, http)
    expect(candidates.map((c) => c.heading)).toEqual(['新しいツールの設計方針'])
  })

  it('本文量で除外した投稿は、件数と元URLを記録として持ち帰り、実行ログ(stderr)に残せること(月次見直しで閾値の妥当性を検証するため)', async () => {
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(atomWithTwoPosts()) })
    const { shortBodyExclusions } = await fetchRssCandidates(simonBlog, criteria, http)
    expect(shortBodyExclusions).toHaveLength(1)
    expect(shortBodyExclusions[0]).toMatchObject({
      sourceId: 'simon-willison',
      url: 'https://simonwillison.net/2026/Aug/2/podcast/',
    })
    expect(shortBodyExclusions[0].bodyChars).toBeLessThan(criteria.minIndividualBlogBodyChars)
  })

  it('公式組織のブログは、本文が短くても本文量では除外されないこと(発信量が少なく信頼性が高いため)', async () => {
    const rss = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title>短い告知記事</title>
          <link>https://www.anthropic.com/news/short</link>
          <pubDate>Sat, 01 Aug 2026 00:00:00 GMT</pubDate>
          <description>ごく短いお知らせ。</description>
        </item>
      </channel></rss>`
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(rss) })
    const { candidates, shortBodyExclusions } = await fetchRssCandidates(anthropicBlog, criteria, http)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].heading).toBe('短い告知記事')
    expect(shortBodyExclusions).toHaveLength(0)
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#データ取得方法-1、specs/ai-dev-digest/content-selection/requirements.md#採用基準(種別ごとの定量判定)-7
describe('Qiitaからの候補収集 - 公開日時が対象期間内の記事だけをCandidate型に変換する', () => {
  const now = new Date('2026-08-30T00:00:00Z')

  it('直近60日以内に公開された記事のいいね数がmetricValueに変換され、期間外の古い記事は候補にならないこと', async () => {
    const http = makeHttp({
      fetchJson: vi.fn().mockResolvedValue([
        {
          title: 'Reactの新機能まとめ',
          url: 'https://qiita.com/example/items/abc123',
          likes_count: 42,
          created_at: '2026-08-20T00:00:00+09:00',
          user: { name: 'example-user' },
        },
        {
          title: '半年前の記事',
          url: 'https://qiita.com/example/items/old999',
          likes_count: 500,
          created_at: '2026-05-01T00:00:00+09:00',
          user: { name: 'example-user' },
        },
      ]),
    })

    const candidates = await fetchQiitaCandidates(http, criteria, now)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      sourceType: 'qiita',
      heading: 'Reactの新機能まとめ',
      url: 'https://qiita.com/example/items/abc123',
      metricValue: 42,
    })
  })

  it('新しい順に辿り、対象期間より古い記事に達した時点でそれ以降のページを辿らないこと', async () => {
    const fetchJson = vi.fn().mockResolvedValue([
      {
        title: '期間内の記事',
        url: 'https://qiita.com/example/items/recent',
        likes_count: 10,
        created_at: '2026-08-25T00:00:00+09:00',
        user: { name: 'u' },
      },
      {
        title: '期間外の記事',
        url: 'https://qiita.com/example/items/stale',
        likes_count: 10,
        created_at: '2026-01-01T00:00:00+09:00',
        user: { name: 'u' },
      },
    ])
    const http = makeHttp({ fetchJson })
    await fetchQiitaCandidates(http, criteria, now)
    // 1ページ目で期間外に到達したため、2ページ目以降のリクエストは発生しない
    expect(fetchJson).toHaveBeenCalledTimes(1)
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#データ取得方法-1、specs/ai-dev-digest/content-selection/requirements.md#採用基準(種別ごとの定量判定)-8
describe('Zennからの候補収集 - RSSで新着を検知し公開ページのいいね数表示値を読み取る', () => {
  const zennFeed = `<?xml version="1.0"?>
    <rss><channel>
      <item>
        <title>AIエージェントの実装パターン</title>
        <link>https://zenn.dev/example/articles/agent-patterns</link>
        <pubDate>Sat, 01 Aug 2026 00:00:00 GMT</pubDate>
      </item>
    </channel></rss>`

  it('公開ページのHTMLからいいね数を読み取れる場合、Candidateに変換されること', async () => {
    const html = `<html><script>window.__DATA__={"article":{"likedCount":35}}</script></html>`
    const http = makeHttp({
      fetchText: vi.fn().mockResolvedValueOnce(zennFeed).mockResolvedValueOnce(html),
    })

    const candidates = await fetchZennCandidates(http)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({ sourceType: 'zenn', metricValue: 35, heading: 'AIエージェントの実装パターン' })
  })

  it('公開ページのHTML構造が変わりいいね数を読み取れない場合、その記事は候補から除外されること', async () => {
    const htmlWithoutLikeCount = `<html><body>ページ構造が変わり、いいね数が見つからない</body></html>`
    const http = makeHttp({
      fetchText: vi.fn().mockResolvedValueOnce(zennFeed).mockResolvedValueOnce(htmlWithoutLikeCount),
    })

    const candidates = await fetchZennCandidates(http)
    expect(candidates).toHaveLength(0)
  })
})

// 仕様: specs/ai-dev-digest/content-selection/design.md#情報源から候補を収集する処理
describe('ウォッチリスト全体からの候補収集 - 1つの情報源が取得に失敗しても他の情報源の結果は返す', () => {
  it('Qiitaの取得が失敗しても、他の情報源(RSS)の候補は正常に返ること', async () => {
    const watchlist: WatchlistEntry[] = [
      anthropicBlog,
      { id: 'qiita', category: 'platform', name: 'Qiita', channels: [{ type: 'platform-qiita' }] },
    ]
    const rss = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title>新しいモデルを発表</title>
          <link>https://www.anthropic.com/news/example</link>
          <pubDate>Sat, 01 Aug 2026 00:00:00 GMT</pubDate>
        </item>
      </channel></rss>`
    const fetchText = vi.fn().mockResolvedValue(rss)
    const fetchJson = vi.fn().mockRejectedValue(new Error('Qiita API障害'))
    const http = makeHttp({ fetchText, fetchJson })

    const { candidates } = await fetchAllCandidates(watchlist, criteria, 'dummy-api-key', http)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].sourceId).toBe('anthropic')
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#情報源の健全性監視-2
describe('情報源ごとの取得件数のログ - フィード廃止・URL変更で無言停止した情報源に気づけるようにする', () => {
  const emptyRss = `<?xml version="1.0"?><rss><channel></channel></rss>`
  const oneItemRss = `<?xml version="1.0"?>
    <rss><channel>
      <item>
        <title>新しいモデルを発表</title>
        <link>https://www.anthropic.com/news/example</link>
        <pubDate>Sat, 01 Aug 2026 00:00:00 GMT</pubDate>
      </item>
    </channel></rss>`

  it('情報源ごとに「取得できた候補件数」と「取得失敗の有無」が集計されて返ること', async () => {
    const watchlist: WatchlistEntry[] = [
      anthropicBlog,
      { id: 'google-developers', category: 'official', name: 'Google Developers', channels: [{ type: 'rss', feedUrl: 'https://blog.google/technology/developers/rss/' }] },
      { id: 'qiita', category: 'platform', name: 'Qiita', channels: [{ type: 'platform-qiita' }] },
    ]
    const fetchText = vi.fn((url: string) => Promise.resolve(url.includes('anthropic') ? oneItemRss : emptyRss))
    const fetchJson = vi.fn().mockRejectedValue(new Error('Qiita API障害'))
    const http = makeHttp({ fetchText, fetchJson })

    const { stats } = await fetchAllCandidates(watchlist, criteria, 'dummy-api-key', http)
    expect(stats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: 'anthropic', channel: 'rss', ok: true, count: 1 }),
        expect.objectContaining({ sourceId: 'google-developers', channel: 'rss', ok: true, count: 0 }),
        expect.objectContaining({ sourceId: 'qiita', channel: 'qiita', ok: false, count: 0 }),
      ])
    )
  })

  it('候補0件・取得失敗の情報源だけが警告(WARN)付きのログ行になること', () => {
    const lines = buildSourceHealthLogLines([
      { sourceId: 'anthropic', sourceName: 'Anthropic', channel: 'rss', ok: true, count: 3 },
      { sourceId: 'google-developers', sourceName: 'Google Developers', channel: 'rss', ok: true, count: 0 },
      { sourceId: 'qiita', sourceName: 'Qiita', channel: 'qiita', ok: false, count: 0 },
    ])
    expect(lines[0]).not.toContain('WARN')
    expect(lines[1]).toContain('WARN')
    expect(lines[2]).toContain('WARN')
  })
})
