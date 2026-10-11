import { describe, it, expect } from 'vitest'
import { parseArticle } from '../../../app/trend-digest/lib/articleSchema'
import { GENRE_ORDER } from '../../../app/trend-digest/lib/types'

// body文字数の範囲(160〜480字)を満たすダミー本文を作る
function makeBody(length = 250): string {
  return 'あ'.repeat(length)
}

function makeTopic(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'topic-1',
    genre: 'music',
    heading: '見出し',
    body: makeBody(),
    sourceTitle: '対象作品名',
    sourceName: 'Oricon',
    sourceUrl: 'https://example.com/a',
    ...overrides,
  }
}

function makeArticle(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '2026-09-15-entertainment',
    edition: 'entertainment',
    date: '2026-09-15',
    topics: [makeTopic()],
    ...overrides,
  }
}

// 指定editionの全ジャンルを1件ずつ持つtopics配列を作る(全ジャンル網羅テスト用)
function makeFullTopics(edition: 'entertainment' | 'culture-lifestyle'): Record<string, unknown>[] {
  return GENRE_ORDER[edition].map((genre, i) => makeTopic({ id: `topic-${i + 1}`, genre }))
}

function makeTrend(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    durationLabel: 'talked',
    heatLabel: 'high',
    continuationDays: 30,
    continuationStartDate: '2026-08-16',
    reportCount: 2,
    originRegion: '日本',
    currentRegions: ['日本', '北米'],
    ...overrides,
  }
}

// 仕様: specs/trend-digest/article-detail/design.md#バリデーション、specs/trend-digest/article-detail/requirements.md#記事本文表示-4、specs/trend-digest/article-detail/requirements.md#表示分量・著作権配慮-2、specs/trend-digest/content-generation/requirements.md#要約-1、specs/trend-digest/content-generation/requirements.md#要約-2、specs/trend-digest/content-generation/requirements.md#要約-6、specs/trend-digest/content-generation/requirements.md#記事の構成-8、specs/trend-digest/content-generation/design.md#本文の分量を検証する処理(決定的なコード)
describe('記事データのバリデーション - JSONのスキーマを検証し、違反時は例外を投げる', () => {
  it('正常な記事データ(トピック1件のみ)は検証を通り、そのままArticleとして返ること', () => {
    const article = parseArticle(makeArticle(), '2026-09-15-entertainment.json')
    expect(article.id).toBe('2026-09-15-entertainment')
    expect(article.topics).toHaveLength(1)
  })

  it('正常な記事データ(複数ジャンル、各ジャンル1件)は検証を通ること', () => {
    const article = parseArticle(
      makeArticle({
        topics: [
          makeTopic({ id: 'topic-1', genre: 'music' }),
          makeTopic({ id: 'topic-2', genre: 'anime' }),
        ],
      }),
      '2026-09-15-entertainment.json'
    )
    expect(article.topics).toHaveLength(2)
  })

  it('topicsが0件の場合、失敗すること', () => {
    expect(() => parseArticle(makeArticle({ topics: [] }), '2026-09-15-entertainment.json')).toThrow()
  })

  it('topicsがその編のジャンル数(entertainment編は9)を超える件数の場合、失敗すること', () => {
    const topics = [
      ...makeFullTopics('entertainment'),
      makeTopic({ id: 'topic-10', genre: 'music' }), // 10件目(9ジャンルを超える)
    ]
    expect(() => parseArticle(makeArticle({ topics }), '2026-09-15-entertainment.json')).toThrow()
  })

  it('unavailableGenresを持つ記事で同一ジャンルのトピックが2件以上存在する場合、失敗すること(各ジャンルから必ず1件掲載する新ルールのため最大1件/ジャンル)', () => {
    const topics = [
      makeTopic({ id: 'topic-1', genre: 'music' }),
      makeTopic({ id: 'topic-2', genre: 'music' }),
    ]
    const unavailableGenres = GENRE_ORDER.entertainment.filter((g) => g !== 'music')
    expect(() => parseArticle(makeArticle({ topics, unavailableGenres }), '2026-09-15-entertainment.json')).toThrow()
  })

  it('unavailableGenresを持たない過去の記事は、同一ジャンルのトピックが2件あっても検証を通ること(新ルール導入前に公開済みの記事はそのまま受け入れる)', () => {
    const topics = [
      makeTopic({ id: 'topic-1', genre: 'music' }),
      makeTopic({ id: 'topic-2', genre: 'music' }),
    ]
    const article = parseArticle(makeArticle({ topics }), '2026-09-15-entertainment.json')
    expect(article.topics).toHaveLength(2)
  })

  it('genreが未定義値の場合、失敗すること', () => {
    const article = makeArticle({ topics: [makeTopic({ genre: 'unknown-genre' })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('genreは定義済みジャンルだが、article.editionに対応するジャンルに属さない場合、失敗すること(例: entertainment編にgourmet(culture-lifestyle専用)が混入)', () => {
    const article = makeArticle({ edition: 'entertainment', topics: [makeTopic({ genre: 'gourmet' })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('idがファイル名と一致しない場合、失敗すること', () => {
    const article = makeArticle({ id: '2026-09-15-entertainment' })
    expect(() => parseArticle(article, '2026-09-16-entertainment.json')).toThrow()
  })

  it('editionが不正値の場合、失敗すること', () => {
    const article = makeArticle({ edition: 'invalid-edition' })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('sourceUrlがhttp/httpsで始まらない場合、失敗すること', () => {
    const article = makeArticle({ topics: [makeTopic({ sourceUrl: 'javascript:alert(1)' })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it.each(['heading', 'body', 'sourceTitle', 'sourceName', 'sourceUrl'])(
    '%sが空文字の場合、失敗すること',
    (field) => {
      const article = makeArticle({ topics: [makeTopic({ [field]: '' })] })
      expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
    }
  )

  it('bodyの文字数が160字未満の場合、失敗すること', () => {
    const article = makeArticle({ topics: [makeTopic({ body: makeBody(159) })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('bodyの文字数が480字を超える場合、失敗すること', () => {
    const article = makeArticle({ topics: [makeTopic({ body: makeBody(481) })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('dateがYYYY-MM-DD形式でない場合、失敗すること', () => {
    const article = makeArticle({ date: '2026/09/15' })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('topics内でidが重複する場合、失敗すること', () => {
    const article = makeArticle({
      topics: [makeTopic({ id: 'topic-1', genre: 'music' }), makeTopic({ id: 'topic-1', genre: 'anime' })],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })
})

// 仕様: specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-17、specs/trend-digest/content-selection/requirements.md#掲載件数-3
describe('記事データのバリデーション - 全ジャンルの網羅(topics+unavailableGenresがGENRE_ORDER[edition]と一致すること)を検証する', () => {
  it('topicsとunavailableGenresを合わせてその編の全ジャンルと一致する場合、検証を通ること', () => {
    const allGenres = GENRE_ORDER.entertainment
    const topics = allGenres.slice(0, 7).map((genre, i) => makeTopic({ id: `topic-${i + 1}`, genre }))
    const unavailableGenres = allGenres.slice(7)
    const article = parseArticle(makeArticle({ topics, unavailableGenres }), '2026-09-15-entertainment.json')
    expect(article.topics).toHaveLength(7)
    expect(article.unavailableGenres).toEqual(unavailableGenres)
  })

  it('topicsとunavailableGenresのどちらにも現れないジャンルがある場合、失敗すること', () => {
    const allGenres = GENRE_ORDER.entertainment
    const topics = allGenres.slice(0, 7).map((genre, i) => makeTopic({ id: `topic-${i + 1}`, genre }))
    // 本来8件必要なunavailableGenresを7件しか指定せず、1ジャンルがどちらにも現れない状態にする
    const unavailableGenres = allGenres.slice(7, 8)
    const article = makeArticle({ topics, unavailableGenres })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('unavailableGenresにtopicsと重複するジャンルが含まれる場合、失敗すること', () => {
    const article = makeArticle({
      topics: [makeTopic({ id: 'topic-1', genre: 'music' })],
      unavailableGenres: ['music', ...GENRE_ORDER.entertainment.slice(1)],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('unavailableGenresにその編に属さないジャンル(culture-lifestyle専用)が含まれる場合、失敗すること', () => {
    const article = makeArticle({
      edition: 'entertainment',
      topics: [makeTopic({ id: 'topic-1', genre: 'music' })],
      unavailableGenres: ['gourmet'],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('unavailableGenres自体に重複した要素がある場合、失敗すること', () => {
    const article = makeArticle({
      topics: [makeTopic({ id: 'topic-1', genre: 'music' })],
      unavailableGenres: ['anime', 'anime'],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('unavailableGenresを持たない記事(この機能より前に公開した過去の記事)は、全ジャンル網羅の検証をせずに通ること', () => {
    const article = parseArticle(
      makeArticle({ topics: [makeTopic({ id: 'topic-1', genre: 'music' })] }),
      '2026-09-15-entertainment.json'
    )
    expect(article.unavailableGenres).toBeUndefined()
  })
})

// 仕様: specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示の扱い-6、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-10、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-11、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-18
describe('記事データのバリデーション - トピックの継続度・注目度の情報(trend)を検証する', () => {
  it('trendを持たないトピック(この機能より前に公開した記事)は検証を通ること', () => {
    const article = parseArticle(makeArticle({ topics: [makeTopic()] }), '2026-09-15-entertainment.json')
    expect(article.topics[0]?.trend).toBeUndefined()
  })

  it('durationLabelが定義外の値の場合、失敗すること', () => {
    const article = makeArticle({
      topics: [makeTopic({ trend: makeTrend({ durationLabel: 'unknown-label' }) })],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('heatLabelが定義外の値の場合、失敗すること', () => {
    const article = makeArticle({
      topics: [makeTopic({ trend: makeTrend({ heatLabel: 'unknown-label' }) })],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('continuationDaysが負数の場合、失敗すること', () => {
    const article = makeArticle({
      topics: [makeTopic({ trend: makeTrend({ continuationDays: -1 }) })],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('continuationStartDateがYYYY-MM-DD形式でない場合、失敗すること', () => {
    const article = makeArticle({
      topics: [makeTopic({ trend: makeTrend({ continuationStartDate: '2026/08/16' }) })],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('continuationStartDateが記事のdateより後の場合、失敗すること', () => {
    const article = makeArticle({
      date: '2026-09-15',
      topics: [makeTopic({ trend: makeTrend({ continuationStartDate: '2026-09-16' }) })],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('reportCountが0以下の場合、失敗すること', () => {
    const article = makeArticle({
      topics: [makeTopic({ trend: makeTrend({ reportCount: 0 }) })],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('durationLabelが"pre-trend"(流行前)のトピックも検証を通ること(各ジャンルから必ず1件を掲載する仕様のため「流行前」が記事に載りうることの回帰テスト)', () => {
    const article = parseArticle(
      makeArticle({
        topics: [
          makeTopic({
            trend: makeTrend({ durationLabel: 'pre-trend', continuationDays: 0, continuationStartDate: '2026-09-15', reportCount: 1 }),
          }),
        ],
      }),
      '2026-09-15-entertainment.json'
    )
    expect(article.topics[0]?.trend?.durationLabel).toBe('pre-trend')
  })

  it('originRegionが51文字以上の場合、失敗すること(地域情報は収集エージェントが生成した自由文字列のため外部入力として検証する)', () => {
    const article = makeArticle({
      topics: [makeTopic({ trend: makeTrend({ originRegion: 'あ'.repeat(51) }) })],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('currentRegionsが11件以上の場合、失敗すること', () => {
    const article = makeArticle({
      topics: [makeTopic({ trend: makeTrend({ currentRegions: Array.from({ length: 11 }, (_, i) => `地域${i}`) }) })],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('originRegionがnull、currentRegionsが空配列の場合(地域が判定できない場合)は検証を通ること', () => {
    const article = parseArticle(
      makeArticle({
        topics: [makeTopic({ trend: makeTrend({ originRegion: null, currentRegions: [] }) })],
      }),
      '2026-09-15-entertainment.json'
    )
    expect(article.topics[0]?.trend?.originRegion).toBeNull()
    expect(article.topics[0]?.trend?.currentRegions).toEqual([])
  })
})

// 100字ずつの固定3観点(fact/reason/caveat)を持つsectionsを作る(3観点合計300字で160〜480字の範囲内)
function makeSections(overrides: Partial<Record<'fact' | 'reason' | 'caveat', Record<string, unknown>>> = {}) {
  const section = (heading: string) => ({ heading, text: 'あ'.repeat(100), diagram: null })
  return {
    fact: section('急上昇の事実の見出し'),
    reason: section('なぜ注目されたかの見出し'),
    caveat: section('確からしさ・注意点の見出し'),
    ...overrides,
  }
}

function makeCurrentTopic(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'topic-1',
    genre: 'music',
    heading: '見出し',
    sections: makeSections(),
    sourceTitle: '対象作品名',
    sourceName: 'Oricon',
    sourceUrl: 'https://example.com/a',
    ...overrides,
  }
}

// 仕様: specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-19、specs/trend-digest/article-detail/design.md#バリデーション
describe('記事データのバリデーション - 新形式(固定3観点sections)のトピックを検証する', () => {
  it('正常な新形式のトピック(sectionsを持つ)は検証を通ること', () => {
    const article = parseArticle(makeArticle({ topics: [makeCurrentTopic()] }), '2026-09-15-entertainment.json')
    expect(article.topics[0]).toMatchObject({ sections: makeSections() })
  })

  it('sectionsにfact/reason/caveatのいずれかが欠落している場合、失敗すること', () => {
    const { fact, reason } = makeSections()
    const article = makeArticle({ topics: [makeCurrentTopic({ sections: { fact, reason } })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('いずれかの観点のheadingが空文字の場合、失敗すること', () => {
    const sections = makeSections({ reason: { heading: '', text: 'あ'.repeat(100), diagram: null } })
    const article = makeArticle({ topics: [makeCurrentTopic({ sections })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('3観点のtextを連結した文字数が160字未満の場合、失敗すること', () => {
    const section = (heading: string) => ({ heading, text: 'あ'.repeat(10), diagram: null })
    const sections = { fact: section('見出し'), reason: section('見出し'), caveat: section('見出し') }
    const article = makeArticle({ topics: [makeCurrentTopic({ sections })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('3観点のtextを連結した文字数が480字を超える場合、失敗すること', () => {
    const section = (heading: string) => ({ heading, text: 'あ'.repeat(200), diagram: null })
    const sections = { fact: section('見出し'), reason: section('見出し'), caveat: section('見出し') }
    const article = makeArticle({ topics: [makeCurrentTopic({ sections })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })
})

// 仕様: specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-20、specs/trend-digest/article-detail/design.md#バリデーション
describe('記事データのバリデーション - 新形式のトピックの観点ごとのdiagramを検証する', () => {
  it('diagramがnullの場合、検証を通ること(図解が不要な観点)', () => {
    const article = parseArticle(makeArticle({ topics: [makeCurrentTopic()] }), '2026-09-15-entertainment.json')
    expect(article.topics[0]).toMatchObject({ sections: { fact: { diagram: null } } })
  })

  it('{type:"mermaid",code}(codeが空文字でない)の場合、検証を通ること', () => {
    const sections = makeSections({ fact: { heading: '見出し', text: 'あ'.repeat(100), diagram: { type: 'mermaid', code: 'flowchart LR\nA-->B' } } })
    const article = parseArticle(makeArticle({ topics: [makeCurrentTopic({ sections })] }), '2026-09-15-entertainment.json')
    expect(article.topics[0]).toMatchObject({ sections: { fact: { diagram: { type: 'mermaid', code: 'flowchart LR\nA-->B' } } } })
  })

  it('{type:"image",path}(pathがcontent/trend-digest/articles/images/配下)の場合、検証を通ること', () => {
    const path = 'content/trend-digest/articles/images/2026-09-15-topic-1-fact.png'
    const sections = makeSections({ fact: { heading: '見出し', text: 'あ'.repeat(100), diagram: { type: 'image', path } } })
    const article = parseArticle(makeArticle({ topics: [makeCurrentTopic({ sections })] }), '2026-09-15-entertainment.json')
    expect(article.topics[0]).toMatchObject({ sections: { fact: { diagram: { type: 'image', path } } } })
  })

  it('type:"mermaid"なのにcodeが空文字の場合、失敗すること', () => {
    const sections = makeSections({ fact: { heading: '見出し', text: 'あ'.repeat(100), diagram: { type: 'mermaid', code: '' } } })
    const article = makeArticle({ topics: [makeCurrentTopic({ sections })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('type:"image"なのにpathがcontent/trend-digest/articles/images/配下を指していない場合、失敗すること', () => {
    const sections = makeSections({ fact: { heading: '見出し', text: 'あ'.repeat(100), diagram: { type: 'image', path: 'content/trend-digest/articles/2026-09-15.json' } } })
    const article = makeArticle({ topics: [makeCurrentTopic({ sections })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('diagram.typeが未定義の値の場合、失敗すること', () => {
    const sections = makeSections({ fact: { heading: '見出し', text: 'あ'.repeat(100), diagram: { type: 'chart' } } })
    const article = makeArticle({ topics: [makeCurrentTopic({ sections })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })
})
