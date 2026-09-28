import { describe, it, expect, vi } from 'vitest'
import { fetchFixedListGenreCandidates } from '../../../app/trend-digest/lib/fetchFixedListCandidates'
import type { SourceFetcher } from '../../../app/trend-digest/lib/fetchFixedListCandidates'
import type { WatchlistEntry, FixedListGenreCriteria } from '../../../app/trend-digest/lib/watchlistTypes'

const MAX_OBSERVATIONS_PER_SOURCE = 30

function entryOf(genre: WatchlistEntry['genre'], sources: Array<{ name: string; url: string }>): WatchlistEntry {
  return {
    genre,
    edition: 'entertainment',
    label: genre,
    method: 'fixed-list',
    sources: sources.map((s) => ({ ...s, region: 'japan' as const })),
  }
}

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1
describe('固定リストジャンルの採用基準判定 - 音楽は新規にランクインした、または前週から順位が大きく(10位以上)上昇した作品を候補にする', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', newEntryOrRisingRank: true, risingRankMinImprovement: 10 }
  const entry = entryOf('music', [{ name: 'Billboard JAPAN Hot 100', url: 'https://example.com/billboard' }])

  it('前週比が「NEW」の項目は新規ランクインとして候補(meetsCriteria: true)になること', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: true,
      items: [{ title: '新曲A', currentRank: 3, isNew: true }],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations.filter((o) => o.meetsCriteria).map((o) => o.title)).toEqual(['新曲A'])
  })

  it('前週から10位以上順位が上昇した項目は候補になり、9位までの上昇は観測項目として記録されるが候補にならないこと', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: true,
      items: [
        { title: '大幅上昇曲', currentRank: 5, previousRank: 15 }, // +10
        { title: '微上昇曲', currentRank: 5, previousRank: 14 }, // +9
      ],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    // 採用基準の判定前の全件が観測項目として残ること(requirements.md#機能要件-3)
    expect(observations.map((o) => o.title)).toEqual(['大幅上昇曲', '微上昇曲'])
    expect(observations.find((o) => o.title === '大幅上昇曲')?.meetsCriteria).toBe(true)
    expect(observations.find((o) => o.title === '微上昇曲')?.meetsCriteria).toBe(false)
  })

  it('情報源のページが前週比データを提供しない場合、過去記事に同名タイトルがなければ新規ランクインとして候補になること', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: false,
      items: [{ title: '未掲載の新曲', currentRank: 8 }],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations.find((o) => o.title === '未掲載の新曲')?.meetsCriteria).toBe(true)
  })

  it('情報源のページが前週比データを提供せず、過去記事に同名タイトル(正規化後)がある場合は候補にならないが観測項目には残ること', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: false,
      items: [{ title: '既出の曲', currentRank: 2 }],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(['既出の曲']), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations).toHaveLength(1)
    expect(observations[0].meetsCriteria).toBe(false)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-2
describe('固定リストジャンルの採用基準判定 - 日本映画・海外映画は直近の週末興行収入ランキング等で上位5位以内の作品を候補にする', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 5 }
  const entry = entryOf('japanese-movie', [{ name: '興行通信社CINEMAランキング通信(国内)', url: 'https://example.com/box-office' }])

  it('5位以内の作品は候補になり、6位以下は候補にならないこと', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: false,
      items: [
        { title: '映画A', currentRank: 5 },
        { title: '映画B', currentRank: 6 },
      ],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations.filter((o) => o.meetsCriteria).map((o) => o.title)).toEqual(['映画A'])
    expect(observations.map((o) => o.title)).toEqual(['映画A', '映画B'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-3
describe('固定リストジャンルの採用基準判定 - 海外ドラマ・サブスク動画・アニメはNetflix公式Top10で新規にランクインした、または順位が上昇した作品を候補にする(上昇幅の指定なし)', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', newEntryOrRisingRank: true }
  const entry = entryOf('foreign-drama', [{ name: 'Netflix公式Top10データ(シリーズ・日本)', url: 'https://example.com/netflix' }])

  it('前週よりわずかでも順位が上昇していれば候補になり、順位が変わらない・下降した作品は候補にならないこと', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: true,
      items: [
        { title: '上昇作品', currentRank: 4, previousRank: 5 },
        { title: '変わらない作品', currentRank: 3, previousRank: 3 },
        { title: '下降作品', currentRank: 8, previousRank: 6 },
      ],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations.filter((o) => o.meetsCriteria).map((o) => o.title)).toEqual(['上昇作品'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-5
describe('固定リストジャンルの採用基準判定 - 書籍・漫画は上位5位以内「かつ」新規にランクインした作品のみを候補にする(いずれか一方だけでは候補にならない)', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 5, newEntryOrRisingRank: true }
  const entry = entryOf('books-comics', [{ name: 'トーハン週間ベストセラー', url: 'https://example.com/tohan' }])

  it('5位以内かつ新規ランクインの作品のみ候補になり、順位内でも新規でなければ候補にならず、新規でも順位圏外なら候補にならないこと', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: false,
      items: [
        { title: '新刊(3位)', currentRank: 3 },
        { title: '既刊(2位)', currentRank: 2 },
        { title: '新刊(7位)', currentRank: 7 },
      ],
    })
    const publishedTitles = new Set(['既刊(2位)', '新刊(7位)'])
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, publishedTitles, fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations.filter((o) => o.meetsCriteria).map((o) => o.title)).toEqual(['新刊(3位)'])
    expect(observations).toHaveLength(3)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-6、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-7、specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-8
describe('固定リストジャンルの採用基準判定 - 流行りの言葉・ゲーム・旅行観光は上位ランクインの項目を候補にし、掲載されている項目自体が話題性のあるものに限られるため追加の定性的な絞り込みは行わない', () => {
  it('流行りの言葉(上位10位以内)は、10位以内の語が候補になり圏外は候補にならないこと', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 10 }
    const entry = entryOf('buzzwords', [{ name: 'Google公式トレンドRSS(日本)', url: 'https://example.com/trends' }])
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: false,
      items: [
        { title: '流行語A', currentRank: 10 },
        { title: '圏外語B', currentRank: 11 },
      ],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations.filter((o) => o.meetsCriteria).map((o) => o.title)).toEqual(['流行語A'])
  })

  it('ゲーム(上位10位以内)は、10位以内の新作・話題作が候補になり圏外は候補にならないこと', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 10 }
    const entry = entryOf('games', [{ name: 'ファミ通.com売上ランキング', url: 'https://example.com/famitsu' }])
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: false,
      items: [
        { title: '話題作A', currentRank: 1 },
        { title: '圏外作B', currentRank: 12 },
      ],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations.filter((o) => o.meetsCriteria).map((o) => o.title)).toEqual(['話題作A'])
  })

  it('旅行・観光(上位10位以内)は、10位以内のスポット・特集が候補になり圏外は候補にならないこと', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 10 }
    const entry = entryOf('travel', [{ name: 'じゃらんnet人気ランキング', url: 'https://example.com/jalan' }])
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: false,
      items: [
        { title: '人気スポットA', currentRank: 9 },
        { title: '圏外スポットB', currentRank: 20 },
      ],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations.filter((o) => o.meetsCriteria).map((o) => o.title)).toEqual(['人気スポットA'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#データ取得方法-1
describe('情報源の取得失敗時の継続 - 1つの情報源の取得に失敗しても、その情報源だけを除外して他の情報源の観測項目は返す', () => {
  it('2つの情報源のうち1つがエラーを投げても、他方の観測項目は返り、失敗した情報源はstatsでok:falseとして記録されること', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 5 }
    const entry = entryOf('japanese-movie', [
      { name: '失敗する情報源', url: 'https://example.com/broken' },
      { name: '成功する情報源', url: 'https://example.com/ok' },
    ])
    const fetchSource: SourceFetcher = vi.fn().mockImplementation((source: { name: string }) => {
      if (source.name === '失敗する情報源') return Promise.reject(new Error('取得失敗'))
      return Promise.resolve({ providesRankChange: false, items: [{ title: '映画X', currentRank: 1 }] })
    })
    const { observations, stats } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations.map((o) => o.title)).toEqual(['映画X'])
    expect(stats.find((s) => s.sourceName === '失敗する情報源')).toMatchObject({ ok: false, observationCount: 0, candidateCount: 0 })
    expect(stats.find((s) => s.sourceName === '成功する情報源')).toMatchObject({ ok: true, observationCount: 1, candidateCount: 1 })
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#機能要件-3
describe('観測項目の記録上限 - 情報源ごとに上位maxObservationsPerSource件までを観測項目として記録する', () => {
  it('情報源が返した件数がmaxObservationsPerSourceを超える場合、上位から順に上限件数までだけが観測項目になること', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 5 }
    const entry = entryOf('japanese-movie', [{ name: '興行通信社CINEMAランキング通信(国内)', url: 'https://example.com/box-office' }])
    const items = Array.from({ length: 10 }, (_, i) => ({ title: `映画${i + 1}`, currentRank: i + 1 }))
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({ providesRankChange: false, items })
    const { observations, stats } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, 3)
    expect(observations).toHaveLength(3)
    expect(observations.map((o) => o.title)).toEqual(['映画1', '映画2', '映画3'])
    expect(stats[0].observationCount).toBe(3)
  })
})

// 仕様: specs/trend-digest/content-selection/design.md「固定リストジャンルの候補を収集・判定する処理」手順6
describe('複数情報源での同一作品の統合 - 書籍・漫画のように複数情報源(トーハン・日販)で同じ作品が観測された場合、より順位が高い方の情報源のデータを1件に統合する', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 5, newEntryOrRisingRank: true }
  const entry = entryOf('books-comics', [
    { name: 'トーハン週間ベストセラー', url: 'https://example.com/tohan' },
    { name: '日販週間ベストセラー', url: 'https://example.com/nippan' },
  ])

  it('同じ作品(正規化タイトルが同一)が2つの情報源で観測された場合、観測項目が1件に統合され、より高い順位(小さい順位番号)のstrengthが採用されること', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockImplementation((source: { name: string }) => {
      if (source.name === 'トーハン週間ベストセラー') {
        return Promise.resolve({ providesRankChange: false, items: [{ title: '共通の新刊', currentRank: 3 }] })
      }
      return Promise.resolve({ providesRankChange: false, items: [{ title: '共通の新刊', currentRank: 5 }] })
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, 30)
    expect(observations).toHaveLength(1)
    expect(observations[0]).toMatchObject({ title: '共通の新刊', rank: 3, strength: 97, sourceName: 'トーハン週間ベストセラー' })
    expect(observations[0].note).toContain('トーハン週間ベストセラー3位')
    expect(observations[0].note).toContain('日販週間ベストセラー5位')
  })

  it('片方の情報源にしか無い作品は、そのまま単独の観測項目として残ること', async () => {
    const fetchSource: SourceFetcher = vi.fn().mockImplementation((source: { name: string }) => {
      if (source.name === 'トーハン週間ベストセラー') {
        return Promise.resolve({ providesRankChange: false, items: [{ title: 'トーハン限定作品', currentRank: 2 }] })
      }
      return Promise.resolve({ providesRankChange: false, items: [{ title: '日販限定作品', currentRank: 4 }] })
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, 30)
    expect(observations.map((o) => o.title).sort()).toEqual(['トーハン限定作品', '日販限定作品'])
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#機能要件-1、specs/trend-digest/trend-history/requirements.md#注目度ラベル-9
describe('観測項目への順位の記録(trend-history連携) - rankはstrengthからの逆算ではなく情報源の実際の順位を持つ', () => {
  it('上昇幅加点があるジャンル(音楽)でも、rankが実際の順位(currentRank)になり、100-strengthとは一致しないこと', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', newEntryOrRisingRank: true, risingRankMinImprovement: 10 }
    const entry = entryOf('music', [{ name: 'Billboard JAPAN Hot 100', url: 'https://example.com/billboard' }])
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: true,
      items: [{ title: '大幅上昇曲', currentRank: 5, previousRank: 20 }],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    const [observation] = observations
    // rankは情報源の実際の順位(currentRank)そのものであり、上昇幅加点で変わるstrengthから逆算した値ではない
    // (musicのようなジャンルでは100-strengthが実際の順位と一致しない場合があるため、rankを別に持つ設計。
    // trend-history/historyTypes.tsのObservation.rankのコメント参照)
    expect(observation.rank).toBe(5)
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#機能要件-2
describe('採用基準を満たさなかった項目の観測保持(trend-history連携) - 人気が定着している作品ほど履歴から消えることを防ぐため、動きがなかった項目もmeetsCriteria: falseとして観測項目に残す', () => {
  it('newEntryOrRisingRankのジャンルで、新規でも順位上昇でもない(上位に居続けている)項目が、候補には含まれないが観測項目には残ること', async () => {
    const criteria: FixedListGenreCriteria = { method: 'fixed-list', newEntryOrRisingRank: true }
    const entry = entryOf('foreign-drama', [{ name: 'Netflix公式Top10データ(シリーズ・日本)', url: 'https://example.com/netflix' }])
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: true,
      items: [{ title: '定着作品', currentRank: 1, previousRank: 1 }],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations.map((o) => o.title)).toEqual(['定着作品'])
    expect(observations[0].meetsCriteria).toBe(false)
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#機能要件-8、specs/trend-digest/trend-history/requirements.md#地域情報-16
describe('地域情報の収集(固定リストジャンル側) - 情報源の地域区分(region)から日本での強度・海外での強度を集計する', () => {
  const criteria: FixedListGenreCriteria = { method: 'fixed-list', rankThreshold: 5 }

  it('日本の情報源だけで検出された項目は日本での強度に検出件数が入り、登録されていない海外の情報源側は「不明」(null)になること', async () => {
    const entry: WatchlistEntry = {
      genre: 'japanese-movie',
      edition: 'entertainment',
      label: '日本映画',
      method: 'fixed-list',
      sources: [{ name: '国内情報源', url: 'https://example.com/jp', region: 'japan' }],
    }
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: false,
      items: [{ title: '映画A', currentRank: 1 }],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations[0].strengthJapan).toBe(1)
    expect(observations[0].strengthOverseas).toBeNull()
  })

  it('日本・海外の両方の情報源で同じ作品が検出された場合、両方の強度に件数が入ること', async () => {
    const entry: WatchlistEntry = {
      genre: 'foreign-movie',
      edition: 'entertainment',
      label: '海外映画',
      method: 'fixed-list',
      sources: [
        { name: '国内情報源', url: 'https://example.com/jp', region: 'japan' },
        { name: '海外情報源', url: 'https://example.com/us', region: 'overseas' },
      ],
    }
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: false,
      items: [{ title: '共通の映画', currentRank: 1 }],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations[0].strengthJapan).toBe(1)
    expect(observations[0].strengthOverseas).toBe(1)
  })

  it('海外の情報源が登録されているジャンルで、海外の情報源では検出されなかった項目は、海外での強度が0件になること(「不明」とは区別する)', async () => {
    const entry: WatchlistEntry = {
      genre: 'foreign-movie',
      edition: 'entertainment',
      label: '海外映画',
      method: 'fixed-list',
      sources: [
        { name: '国内情報源', url: 'https://example.com/jp', region: 'japan' },
        { name: '海外情報源', url: 'https://example.com/us', region: 'overseas' },
      ],
    }
    const fetchSource: SourceFetcher = vi.fn().mockImplementation((source: { name: string }) => {
      if (source.name === '国内情報源') return Promise.resolve({ providesRankChange: false, items: [{ title: '国内限定の映画', currentRank: 1 }] })
      return Promise.resolve({ providesRankChange: false, items: [] })
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations[0].strengthJapan).toBe(1)
    expect(observations[0].strengthOverseas).toBe(0)
  })

  it('発祥地域・主な流行地域はランキング情報源からは判定できないため「不明」のままになること', async () => {
    const entry: WatchlistEntry = {
      genre: 'japanese-movie',
      edition: 'entertainment',
      label: '日本映画',
      method: 'fixed-list',
      sources: [{ name: '国内情報源', url: 'https://example.com/jp', region: 'japan' }],
    }
    const fetchSource: SourceFetcher = vi.fn().mockResolvedValue({
      providesRankChange: false,
      items: [{ title: '映画A', currentRank: 1 }],
    })
    const { observations } = await fetchFixedListGenreCandidates(entry, criteria, new Set(), fetchSource, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations[0].originRegion).toBeNull()
    expect(observations[0].currentRegions).toEqual([])
  })
})
