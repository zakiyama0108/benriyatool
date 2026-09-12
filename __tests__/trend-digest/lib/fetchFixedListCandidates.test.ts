import { describe, it, expect, vi } from 'vitest'
import { fetchFixedListGenreCandidates } from '../../../app/trend-digest/lib/fetchFixedListCandidates'
import type { SourceFetcher } from '../../../app/trend-digest/lib/fetchFixedListCandidates'
import type { WatchlistEntry, FixedListGenreCriteria } from '../../../app/trend-digest/lib/watchlistTypes'

function entryOf(genre: WatchlistEntry['genre'], sources: WatchlistEntry['sources']): WatchlistEntry {
  return { genre, edition: 'entertainment', label: genre, method: 'fixed-list', sources }
}

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1
describe('固定リストジャンルの採用基準判定 - 音楽は新規にランクインした、または前週から順位が大きく(10位以上)上昇した作品を候補にする', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', newEntryOrRisingRank: true, risingRankMinImprovement: 10 }
  const entry = entryOf('music', [{ name: 'Oricon週間チャート', url: 'https://example.com/oricon' }])

  it('前週比が「NEW」の項目は新規ランクインとして候補になること', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      kind: 'ranked',
      providesRankChange: true,
      items: [{ title: '新曲A', currentRank: 3, isNew: true }],
    })
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource)
    expect(candidates.map((c) => c.title)).toEqual(['新曲A'])
  })

  it('前週から10位以上順位が上昇した項目は候補になり、9位までの上昇は候補にならないこと', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      kind: 'ranked',
      providesRankChange: true,
      items: [
        { title: '大幅上昇曲', currentRank: 5, previousRank: 15 }, // +10
        { title: '微上昇曲', currentRank: 5, previousRank: 14 }, // +9
      ],
    })
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource)
    expect(candidates.map((c) => c.title)).toEqual(['大幅上昇曲'])
  })

  it('情報源のページが前週比データを提供しない場合、過去記事に同名タイトルがなければ新規ランクインとして候補になること', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      kind: 'ranked',
      providesRankChange: false,
      items: [{ title: '未掲載の新曲', currentRank: 8 }],
    })
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource)
    expect(candidates.map((c) => c.title)).toEqual(['未掲載の新曲'])
  })

  it('情報源のページが前週比データを提供せず、過去記事に同名タイトル(正規化後)がある場合は候補にならないこと', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      kind: 'ranked',
      providesRankChange: false,
      items: [{ title: '既出の曲', currentRank: 2 }],
    })
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, new Set(['既出の曲']), fetchSource)
    expect(candidates).toHaveLength(0)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-2
describe('固定リストジャンルの採用基準判定 - 日本映画・海外映画は直近の週末興行収入ランキング等で上位5位以内の作品を候補にする', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 5 }
  const entry = entryOf('japanese-movie', [{ name: '週末興行収入ランキング', url: 'https://example.com/box-office' }])

  it('5位以内の作品は候補になり、6位以下は候補にならないこと', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      kind: 'ranked',
      providesRankChange: false,
      items: [
        { title: '映画A', currentRank: 5 },
        { title: '映画B', currentRank: 6 },
      ],
    })
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource)
    expect(candidates.map((c) => c.title)).toEqual(['映画A'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-3
describe('固定リストジャンルの採用基準判定 - 海外ドラマ・サブスク動画・アニメはNetflix公式Top10で新規にランクインした、または順位が上昇した作品を候補にする(上昇幅の指定なし)', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', newEntryOrRisingRank: true }
  const entry = entryOf('foreign-drama', [{ name: 'Netflix公式Top10(シリーズ・日本)', url: 'https://example.com/netflix' }])

  it('前週よりわずかでも順位が上昇していれば候補になり、順位が変わらない・下降した作品は候補にならないこと', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      kind: 'ranked',
      providesRankChange: true,
      items: [
        { title: '上昇作品', currentRank: 4, previousRank: 5 },
        { title: '変わらない作品', currentRank: 3, previousRank: 3 },
        { title: '下降作品', currentRank: 8, previousRank: 6 },
      ],
    })
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource)
    expect(candidates.map((c) => c.title)).toEqual(['上昇作品'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-4
describe('固定リストジャンルの採用基準判定 - 書籍・漫画は上位5位以内「かつ」新規にランクインした作品のみを候補にする(いずれか一方だけでは候補にならない)', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 5, newEntryOrRisingRank: true }
  const entry = entryOf('books-comics', [{ name: 'トーハン週間ベストセラー', url: 'https://example.com/tohan' }])

  it('5位以内かつ新規ランクインの作品のみ候補になり、順位内でも新規でなければ候補にならず、新規でも順位圏外なら候補にならないこと', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      kind: 'ranked',
      providesRankChange: false,
      items: [
        { title: '新刊(3位)', currentRank: 3 },
        { title: '既刊(2位)', currentRank: 2 },
        { title: '新刊(7位)', currentRank: 7 },
      ],
    })
    const publishedTitles = new Set(['既刊(2位)', '新刊(7位)'])
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, publishedTitles, fetchSource)
    expect(candidates.map((c) => c.title)).toEqual(['新刊(3位)'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-6、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-7
describe('固定リストジャンルの採用基準判定 - ファッション・ガジェット家電は新着記事一覧型の情報源をそのまま候補にし、順位付きランキング型の情報源のみ順位の上限を適用する', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 10 }
  const entry = entryOf('fashion', [
    { name: 'WWD JAPAN新着記事', url: 'https://example.com/wwd' },
    { name: 'ZOZOTOWN人気ランキング', url: 'https://example.com/zozo' },
  ])

  it('新着記事一覧型の情報源(WWD JAPAN)は順位を持たないため件数上限判定を行わずそのまま候補になり、順位付きランキング型(ZOZOTOWN)は10位以内のみ候補になること', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockImplementation((source: { name: string }) => {
      if (source.name === 'WWD JAPAN新着記事') {
        return Promise.resolve({ kind: 'new-articles', items: [{ title: '新着企画記事A', publishedAt: '2026-09-01T00:00:00Z' }] })
      }
      return Promise.resolve({
        kind: 'ranked',
        providesRankChange: false,
        items: [
          { title: '人気アイテムA', currentRank: 10 },
          { title: '圏外アイテムB', currentRank: 11 },
        ],
      })
    })
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource)
    expect(candidates.map((c) => c.title).sort()).toEqual(['人気アイテムA', '新着企画記事A'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-5、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-8、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-9
describe('固定リストジャンルの採用基準判定 - 流行りの言葉・ゲーム・旅行観光は上位ランクインの項目を候補にし、掲載されている項目自体が話題性のあるものに限られるため追加の定性的な絞り込みは行わない', () => {
  it('流行りの言葉(上位10位以内)は、10位以内の語が候補になり圏外は候補にならないこと', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 10 }
    const entry = entryOf('buzzwords', [{ name: 'Googleトレンド急上昇ワード', url: 'https://example.com/trends' }])
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      kind: 'ranked',
      providesRankChange: false,
      items: [
        { title: '流行語A', currentRank: 10 },
        { title: '圏外語B', currentRank: 11 },
      ],
    })
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource)
    expect(candidates.map((c) => c.title)).toEqual(['流行語A'])
  })

  it('ゲーム(上位10位以内)は、10位以内の新作・話題作が候補になり圏外は候補にならないこと', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 10 }
    const entry = entryOf('games', [{ name: 'Steam売上ランキング', url: 'https://example.com/steam' }])
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      kind: 'ranked',
      providesRankChange: false,
      items: [
        { title: '話題作A', currentRank: 1 },
        { title: '圏外作B', currentRank: 12 },
      ],
    })
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource)
    expect(candidates.map((c) => c.title)).toEqual(['話題作A'])
  })

  it('旅行・観光(上位10位以内)は、10位以内のスポット・特集が候補になり圏外は候補にならないこと', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 10 }
    const entry = entryOf('travel', [{ name: 'じゃらんnet人気ランキング', url: 'https://example.com/jalan' }])
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      kind: 'ranked',
      providesRankChange: false,
      items: [
        { title: '人気スポットA', currentRank: 9 },
        { title: '圏外スポットB', currentRank: 20 },
      ],
    })
    const { candidates } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource)
    expect(candidates.map((c) => c.title)).toEqual(['人気スポットA'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#データ取得方法-1
describe('情報源の取得失敗時の継続 - 1つの情報源の取得に失敗しても、その情報源だけを除外して他の情報源の結果は返す', () => {
  it('2つの情報源のうち1つがエラーを投げても、他方の候補は返り、失敗した情報源はstatsでok:falseとして記録されること', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 5 }
    const entry = entryOf('japanese-movie', [
      { name: '失敗する情報源', url: 'https://example.com/broken' },
      { name: '成功する情報源', url: 'https://example.com/ok' },
    ])
    const fetchSource: SourceFetcher = vi.fn().mockImplementation((source: { name: string }) => {
      if (source.name === '失敗する情報源') return Promise.reject(new Error('取得失敗'))
      return Promise.resolve({ kind: 'ranked', providesRankChange: false, items: [{ title: '映画X', currentRank: 1 }] })
    })
    const { candidates, stats } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource)
    expect(candidates.map((c) => c.title)).toEqual(['映画X'])
    expect(stats.find((s) => s.sourceName === '失敗する情報源')).toMatchObject({ ok: false, count: 0 })
    expect(stats.find((s) => s.sourceName === '成功する情報源')).toMatchObject({ ok: true, count: 1 })
  })
})
