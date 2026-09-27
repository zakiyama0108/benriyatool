import { describe, it, expect } from 'vitest'
import { parseArticle } from '../../../app/future-digest/lib/articleSchema'
import genresData from '../../../content/future-digest/genres.json'

const GENRE_IDS = (genresData as { id: string }[]).map((g) => g.id)
// issueNumber=1(奇数回)は近未来・長期未来を扱う(article-detail/design.md「前提: 記事データの形式」)
const HORIZONS = ['near', 'long'] as const

function makeBody(length = 250): string {
  return 'あ'.repeat(length)
}

function makePrediction(genre: string, horizon: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: `${genre}--${horizon}`,
    genre,
    horizon,
    heading: '見出し',
    body: makeBody(),
    impact: 'medium',
    impactReason: '影響度の根拠',
    targetPeriod: '2030年まで',
    sourceTitle: '元記事タイトル',
    sourceName: '情報源',
    sourceUrl: 'https://example.com/a',
    ...overrides,
  }
}

// 10ジャンル×2時間軸=20枠のうち、末尾2ジャンルのnear枠だけをemptySlot(collection-failed/no-candidate)にし、
// 予測18件+掲載できなかった枠2件の正常な記事データを組み立てる
function makeValidArticleData(overrides: Partial<Record<string, unknown>> = {}) {
  const predictions: Record<string, unknown>[] = []
  const emptySlots: Record<string, unknown>[] = []

  GENRE_IDS.forEach((genre, i) => {
    HORIZONS.forEach((horizon) => {
      const isEmptyTarget = i >= GENRE_IDS.length - 2 && horizon === 'near'
      if (!isEmptyTarget) {
        predictions.push(makePrediction(genre, horizon))
        return
      }
      if (i === GENRE_IDS.length - 1) {
        emptySlots.push({ genre, horizon, reason: 'no-candidate' })
      } else {
        emptySlots.push({ genre, horizon, reason: 'collection-failed', collectionFailureReason: 'timeout' })
      }
    })
  })

  return {
    id: '2026-09-24',
    date: '2026-09-24',
    issueNumber: 1,
    predictions,
    emptySlots,
    ...overrides,
  }
}

// 全枠(20枠)をemptySlotだけにした記事データ(予測0件)を組み立てる
function makeAllEmptyArticleData() {
  const reasons: Array<{ reason: string; collectionFailureReason?: string }> = [
    { reason: 'no-candidate' },
    { reason: 'collection-failed', collectionFailureReason: 'invalid-format' },
    { reason: 'generation-failed' },
  ]
  const emptySlots: Record<string, unknown>[] = []
  GENRE_IDS.forEach((genre, i) => {
    HORIZONS.forEach((horizon) => {
      emptySlots.push({ genre, horizon, ...reasons[i % reasons.length] })
    })
  })
  return { id: '2026-09-24', date: '2026-09-24', issueNumber: 1, predictions: [], emptySlots }
}

// 仕様: specs/future-digest/article-detail/design.md「バリデーション」
describe('parseArticle - 記事データ(JSON)のスキーマを検証し、違反時は例外を投げる', () => {
  it('正常な記事データ(予測18件+掲載できなかった枠2件)を受け付けること', () => {
    const article = parseArticle(makeValidArticleData(), '2026-09-24.json')
    expect(article.predictions).toHaveLength(18)
    expect(article.emptySlots).toHaveLength(2)
  })

  it('予測が0件で、掲載できなかった枠だけ(候補なし・収集失敗・生成失敗のいずれか)の記事も受け付けること', () => {
    const article = parseArticle(makeAllEmptyArticleData(), '2026-09-24.json')
    expect(article.predictions).toHaveLength(0)
    expect(article.emptySlots).toHaveLength(GENRE_IDS.length * 2)
  })

  it('記事に現れるジャンルで、その回の2時間軸の片方が欠けている場合に拒否すること', () => {
    // 先頭ジャンルのlong枠を除外し、near枠だけにする
    const data = makeValidArticleData()
    data.predictions = (data.predictions).filter(
      (p) => !(p.genre === GENRE_IDS[0] && p.horizon === 'long')
    )
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('同じ枠(ジャンル×時間軸)が重複する場合に拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions.push(makePrediction(GENRE_IDS[0], 'near'))
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('genres.jsonにないジャンルの場合に拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], genre: 'unknown-genre' }
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('その回の時間軸(near/long)以外のhorizonを持つ予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], horizon: 'mid', id: `${GENRE_IDS[0]}--mid` }
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('idが<genre>--<horizon>と一致しない予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], id: '不正なid' }
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it.each(['heading', 'body', 'impactReason', 'targetPeriod', 'sourceTitle', 'sourceName', 'sourceUrl'])(
    '%sが空文字の予測を拒否すること',
    (field) => {
      const data = makeValidArticleData()
      const predictions = data.predictions
      predictions[0] = { ...predictions[0], [field]: '' }
      expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
    }
  )

  it('sourceUrlがhttp/https以外の予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], sourceUrl: 'javascript:alert(1)' }
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('本文が160字未満の予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], body: makeBody(159) }
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('本文が480字を超える予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], body: makeBody(481) }
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('issueNumberが1未満の記事データを拒否すること', () => {
    const data = makeValidArticleData({ issueNumber: 0 })
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('reasonが定義外の値の掲載できなかった枠を拒否すること', () => {
    const data = makeValidArticleData()
    const emptySlots = data.emptySlots
    emptySlots[0] = { ...emptySlots[0], reason: 'unknown-reason' }
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('reasonがcollection-failedで、collectionFailureReasonが欠けている場合に拒否すること', () => {
    const data = makeValidArticleData()
    const emptySlots = data.emptySlots
    emptySlots[0] = { genre: emptySlots[0].genre, horizon: emptySlots[0].horizon, reason: 'collection-failed' }
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('reasonがcollection-failedで、collectionFailureReasonが定義外の値の場合に拒否すること', () => {
    const data = makeValidArticleData()
    const emptySlots = data.emptySlots
    emptySlots[0] = { ...emptySlots[0], reason: 'collection-failed', collectionFailureReason: 'unknown' }
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('reasonがno-candidateで、collectionFailureReasonを持つ場合に拒否すること', () => {
    const data = makeValidArticleData()
    const emptySlots = data.emptySlots
    const noCandidate = emptySlots.find((s) => s.reason === 'no-candidate')!
    Object.assign(noCandidate, { collectionFailureReason: 'timeout' })
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('reasonがgeneration-failedで、collectionFailureReasonを持つ場合に拒否すること', () => {
    const data = makeAllEmptyArticleData()
    const generationFailed = data.emptySlots.find((s) => s.reason === 'generation-failed')!
    Object.assign(generationFailed, { collectionFailureReason: 'timeout' })
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('idがファイル名(拡張子除く)と一致しない場合に拒否すること', () => {
    const data = makeValidArticleData()
    expect(() => parseArticle(data, '2026-09-25.json')).toThrow()
  })

  it('dateがYYYY-MM-DD形式でない場合に拒否すること', () => {
    const data = makeValidArticleData({ date: '2026/09/24' })
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })
})
