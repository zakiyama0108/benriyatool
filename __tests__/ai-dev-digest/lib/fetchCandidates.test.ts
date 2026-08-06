import { describe, it, expect, vi } from 'vitest'
import {
  fetchYoutubeCandidates,
  fetchRssCandidates,
  fetchQiitaCandidates,
  fetchZennCandidates,
  fetchAllCandidates,
} from '../../../app/ai-dev-digest/lib/fetchCandidates'
import type { HttpClient } from '../../../app/ai-dev-digest/lib/fetchCandidates'
import type { WatchlistEntry, Criteria } from '../../../app/ai-dev-digest/lib/watchlistTypes'

const criteria: Criteria = {
  dailyTopicCount: { min: 3, max: 5 },
  youtubeRecentVideoWindow: 2,
  youtubeAboveAverageRatio: 1.2,
  qiitaMinLikes: 30,
  zennMinLikes: 30,
  topicExcludeKeywords: [],
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

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#データ取得方法-1
describe('YouTube情報源からの候補収集 - YouTube Data APIのレスポンスをCandidate型に変換する', () => {
  it('直近の動画群から、最新1本を候補・残りを平均再生回数の算出対象としてCandidateに変換すること', async () => {
    const fetchJson = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: 'UC_karpathy' }] }) // channels.list
      .mockResolvedValueOnce({
        items: [
          { id: { videoId: 'newVideo' }, snippet: { title: '最新の動画', publishedAt: '2026-08-01T00:00:00Z' } },
          { id: { videoId: 'old1' }, snippet: { title: '過去の動画1', publishedAt: '2026-07-20T00:00:00Z' } },
          { id: { videoId: 'old2' }, snippet: { title: '過去の動画2', publishedAt: '2026-07-10T00:00:00Z' } },
        ],
      }) // search.list
      .mockResolvedValueOnce({
        items: [
          { id: 'newVideo', statistics: { viewCount: '5000' } },
          { id: 'old1', statistics: { viewCount: '1000' } },
          { id: 'old2', statistics: { viewCount: '2000' } },
        ],
      }) // videos.list

    const http = makeHttp({ fetchJson })
    const candidates = await fetchYoutubeCandidates(karpathy, 'dummy-api-key', criteria, http)

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      sourceId: 'karpathy',
      sourceName: 'Andrej Karpathy',
      sourceType: 'individual-youtube',
      heading: '最新の動画',
      url: 'https://www.youtube.com/watch?v=newVideo',
      metricValue: 5000,
      recentAverageViews: 1500, // (1000 + 2000) / 2
    })
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

    const candidates = await fetchRssCandidates(anthropicBlog, http)
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
    const simon: WatchlistEntry = {
      id: 'simon-willison',
      category: 'individual-blog',
      name: 'Simon Willison',
      channels: [{ type: 'rss', feedUrl: 'https://simonwillison.net/atom/everything/' }],
    }
    const atom = `<?xml version="1.0"?>
      <feed>
        <entry>
          <title>LLMツールの新機能について</title>
          <link href="https://simonwillison.net/2026/Aug/1/example/" />
          <updated>2026-08-01T00:00:00Z</updated>
        </entry>
      </feed>`
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(atom) })

    const candidates = await fetchRssCandidates(simon, http)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      sourceType: 'individual-blog',
      heading: 'LLMツールの新機能について',
      url: 'https://simonwillison.net/2026/Aug/1/example/',
    })
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#データ取得方法-1、specs/ai-dev-digest/content-selection/requirements.md#採用基準(種別ごとの定量判定)-7
describe('Qiitaからの候補収集 - Qiita公式APIのレスポンスをCandidate型に変換する', () => {
  it('新着記事のいいね数(likes_count)がmetricValueに変換されること', async () => {
    const http = makeHttp({
      fetchJson: vi.fn().mockResolvedValue([
        {
          title: 'Reactの新機能まとめ',
          url: 'https://qiita.com/example/items/abc123',
          likes_count: 42,
          created_at: '2026-08-01T00:00:00+09:00',
          user: { name: 'example-user' },
        },
      ]),
    })

    const candidates = await fetchQiitaCandidates(http)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      sourceType: 'qiita',
      heading: 'Reactの新機能まとめ',
      url: 'https://qiita.com/example/items/abc123',
      metricValue: 42,
    })
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

    const candidates = await fetchAllCandidates(watchlist, criteria, 'dummy-api-key', http)
    expect(candidates).toHaveLength(1)
    expect(candidates[0].sourceId).toBe('anthropic')
  })
})
