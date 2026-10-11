import { describe, it, expect } from 'vitest'
import { parseArticle } from '../../../app/future-digest/lib/articleSchema'
import { EDITION_GENRES } from '../../../app/future-digest/lib/genres'

const EDITION = 'science-tech' as const
const GENRE_IDS = EDITION_GENRES[EDITION]
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

// 対象編(サイエンス・テクノロジー編)5ジャンル×2時間軸=10枠のうち、末尾2ジャンルのnear枠だけを
// emptySlot(collection-failed/no-candidate)にし、予測8件+掲載できなかった枠2件の正常な記事データを組み立てる
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
    id: `2026-09-24-${EDITION}`,
    edition: EDITION,
    date: '2026-09-24',
    issueNumber: 1,
    predictions,
    emptySlots,
    ...overrides,
  }
}

// 全枠(10枠)をemptySlotだけにした記事データ(予測0件)を組み立てる
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
  return { id: `2026-09-24-${EDITION}`, edition: EDITION, date: '2026-09-24', issueNumber: 1, predictions: [], emptySlots }
}

// 仕様: specs/future-digest/article-detail/design.md「バリデーション」
describe('記事データ(JSON)のスキーマ検証 - 違反時は例外を投げる', () => {
  it('正常な記事データ(予測8件+掲載できなかった枠2件)を受け付けること', () => {
    const article = parseArticle(makeValidArticleData(), `2026-09-24-${EDITION}.json`)
    expect(article.predictions).toHaveLength(GENRE_IDS.length * 2 - 2)
    expect(article.emptySlots).toHaveLength(2)
  })

  it('予測が0件で、掲載できなかった枠だけ(候補なし・収集失敗・生成失敗のいずれか)の記事も受け付けること', () => {
    const article = parseArticle(makeAllEmptyArticleData(), `2026-09-24-${EDITION}.json`)
    expect(article.predictions).toHaveLength(0)
    expect(article.emptySlots).toHaveLength(GENRE_IDS.length * 2)
  })

  it('記事に現れるジャンルで、その回の2時間軸の片方が欠けている場合に拒否すること', () => {
    // 先頭ジャンルのlong枠を除外し、near枠だけにする
    const data = makeValidArticleData()
    data.predictions = (data.predictions).filter(
      (p) => !(p.genre === GENRE_IDS[0] && p.horizon === 'long')
    )
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('同じ枠(ジャンル×時間軸)が重複する場合に拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions.push(makePrediction(GENRE_IDS[0], 'near'))
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('genres.jsonにないジャンルの場合に拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], genre: 'unknown-genre' }
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('その回の時間軸(near/long)以外のhorizonを持つ予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], horizon: 'mid', id: `${GENRE_IDS[0]}--mid` }
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('idが<genre>--<horizon>と一致しない予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], id: '不正なid' }
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it.each(['heading', 'body', 'impactReason', 'targetPeriod', 'sourceTitle', 'sourceName', 'sourceUrl'])(
    '%sが空文字の予測を拒否すること',
    (field) => {
      const data = makeValidArticleData()
      const predictions = data.predictions
      predictions[0] = { ...predictions[0], [field]: '' }
      expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
    }
  )

  it('sourceUrlがhttp/https以外の予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], sourceUrl: 'javascript:alert(1)' }
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('本文が160字未満の予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], body: makeBody(159) }
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('本文が480字を超える予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], body: makeBody(481) }
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('issueNumberが1未満の記事データを拒否すること', () => {
    const data = makeValidArticleData({ issueNumber: 0 })
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('reasonが定義外の値の掲載できなかった枠を拒否すること', () => {
    const data = makeValidArticleData()
    const emptySlots = data.emptySlots
    emptySlots[0] = { ...emptySlots[0], reason: 'unknown-reason' }
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('reasonがcollection-failedで、collectionFailureReasonが欠けている場合に拒否すること', () => {
    const data = makeValidArticleData()
    const emptySlots = data.emptySlots
    emptySlots[0] = { genre: emptySlots[0].genre, horizon: emptySlots[0].horizon, reason: 'collection-failed' }
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('reasonがcollection-failedで、collectionFailureReasonが定義外の値の場合に拒否すること', () => {
    const data = makeValidArticleData()
    const emptySlots = data.emptySlots
    emptySlots[0] = { ...emptySlots[0], reason: 'collection-failed', collectionFailureReason: 'unknown' }
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('reasonがno-candidateで、collectionFailureReasonを持つ場合に拒否すること', () => {
    const data = makeValidArticleData()
    const emptySlots = data.emptySlots
    const noCandidate = emptySlots.find((s) => s.reason === 'no-candidate')!
    Object.assign(noCandidate, { collectionFailureReason: 'timeout' })
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('reasonがgeneration-failedで、collectionFailureReasonを持つ場合に拒否すること', () => {
    const data = makeAllEmptyArticleData()
    const generationFailed = data.emptySlots.find((s) => s.reason === 'generation-failed')!
    Object.assign(generationFailed, { collectionFailureReason: 'timeout' })
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('idがファイル名(拡張子除く)と一致しない場合に拒否すること', () => {
    const data = makeValidArticleData()
    expect(() => parseArticle(data, `2026-09-25-${EDITION}.json`)).toThrow()
  })

  it('dateがYYYY-MM-DD形式でない場合に拒否すること', () => {
    const data = makeValidArticleData({ date: '2026/09/24' })
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('editionが定義外の値の場合に拒否すること', () => {
    const data = makeValidArticleData({ edition: 'other-edition' })
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('idが<date>-<edition>形式と一致しない場合に拒否すること(日付のみのid)', () => {
    const data = makeValidArticleData({ id: '2026-09-24' })
    expect(() => parseArticle(data, '2026-09-24.json')).toThrow()
  })

  it('予測のgenreが記事のedition(対象編)に属さないジャンルの場合に拒否すること(他編のジャンルを混入)', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], genre: 'economy-work' } // life-society編のジャンル
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('掲載できなかった枠のgenreが記事のedition(対象編)に属さないジャンルの場合に拒否すること(他編のジャンルを混入)', () => {
    const data = makeValidArticleData()
    const emptySlots = data.emptySlots
    emptySlots[0] = { ...emptySlots[0], genre: 'economy-work' } // life-society編のジャンル
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })
})

function makeSection(length: number, overrides: Partial<{ heading: string; text: string; diagram: unknown }> = {}) {
  return { heading: '見出し', text: 'あ'.repeat(length), diagram: null, ...overrides }
}

// 3観点のtextの合計が指定文字数になるよう、ほぼ均等に3分割して組み立てる
function makeSections(totalLength = 250) {
  const base = Math.floor(totalLength / 3)
  const remainder = totalLength - base * 3
  return {
    when: makeSection(base + remainder),
    basis: makeSection(base),
    impact: makeSection(base),
  }
}

// 仕様: specs/future-digest/article-detail/requirements.md#記事本文の表示-14、specs/future-digest/article-detail/design.md「バリデーション」
describe('記事データ(JSON)のスキーマ検証(固定3観点・新形式) - sectionsを持つ予測(この機能以降に生成する記事)を検証する', () => {
  it('sections(固定3観点、各diagramがnull)を持つ正常な予測を受け付けること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], body: undefined, sections: makeSections() }
    delete predictions[0].body
    const article = parseArticle(data, `2026-09-24-${EDITION}.json`)
    expect(article.predictions).toHaveLength(predictions.length)
  })

  it('sections.basisのdiagramが{type:"mermaid",code:非空文字}のとき、受け付けること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    const sections = makeSections()
    sections.basis = makeSection(Math.floor(250 / 3), { diagram: { type: 'mermaid', code: 'flowchart LR\nA-->B' } })
    predictions[0] = { ...predictions[0], sections }
    delete predictions[0].body
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).not.toThrow()
  })

  it('sections.impactのdiagramが{type:"image",path:"content/future-digest/articles/images/..."}のとき、受け付けること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    const sections = makeSections()
    sections.impact = makeSection(Math.floor(250 / 3), {
      diagram: { type: 'image', path: 'content/future-digest/articles/images/2026-09-24-technology-ai-near-impact.png' },
    })
    predictions[0] = { ...predictions[0], sections }
    delete predictions[0].body
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).not.toThrow()
  })

  it('sections.when/basis/impactのいずれかのキーが欠落している場合に拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    const sections = makeSections() as Record<string, unknown>
    delete sections.basis
    predictions[0] = { ...predictions[0], sections }
    delete predictions[0].body
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('sections.whenのheadingが空文字の場合に拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    const sections = makeSections()
    sections.when = makeSection(Math.floor(250 / 3), { heading: '' })
    predictions[0] = { ...predictions[0], sections }
    delete predictions[0].body
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('3観点のtext合計が160字未満の場合に拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], sections: makeSections(159) }
    delete predictions[0].body
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('3観点のtext合計が480字を超える場合に拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    predictions[0] = { ...predictions[0], sections: makeSections(481) }
    delete predictions[0].body
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('diagramがtype不明の場合に拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    const sections = makeSections()
    sections.when = makeSection(Math.floor(250 / 3), { diagram: { type: 'chart', code: 'x' } })
    predictions[0] = { ...predictions[0], sections }
    delete predictions[0].body
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('diagramがtype:"image"だがpathが画像の保存先配下でない場合に拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    const sections = makeSections()
    sections.when = makeSection(Math.floor(250 / 3), { diagram: { type: 'image', path: '/etc/passwd' } })
    predictions[0] = { ...predictions[0], sections }
    delete predictions[0].body
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })

  it('bodyもsectionsも持たない予測を拒否すること', () => {
    const data = makeValidArticleData()
    const predictions = data.predictions
    delete predictions[0].body
    expect(() => parseArticle(data, `2026-09-24-${EDITION}.json`)).toThrow()
  })
})
