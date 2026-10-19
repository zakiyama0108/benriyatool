import { describe, it, expect } from 'vitest'
import { normalizeTitle, compareCandidates, selectEditionTopics } from '../../../app/trend-digest/lib/selection'
import type { CandidateWithJudgement, GenreObservations, JudgementLookup } from '../../../app/trend-digest/lib/selection'
import type { Candidate } from '../../../app/trend-digest/lib/candidateTypes'
import type { HistoryJudgement } from '../../../app/trend-digest/lib/historyTypes'
import type { Genre } from '../../../app/trend-digest/lib/types'
import { GENRE_ORDER } from '../../../app/trend-digest/lib/types'
import type { Criteria } from '../../../app/trend-digest/lib/watchlistTypes'

// selectEditionTopicsの4引数目(focusAreasの解決にのみ使う)。テストではfocusAreasを指定しない限り
// 全ジャンルがwebsearch・focusAreasなしとして扱われれば十分なため、実際のcontent/criteria.jsonの値を
// 再現する必要はない(minIndependentSources自体はbaseCandidateのmeetsCriteriaで直接指定するため無関係)
function baseCriteria(overrides: Partial<Record<Genre, { focusAreas?: string[] }>> = {}): Criteria {
  const allGenres = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]
  const genreCriteria = Object.fromEntries(
    allGenres.map((genre) => [genre, { method: 'websearch' as const, minIndependentSources: 1, ...overrides[genre] }])
  ) as Criteria['genreCriteria']
  return {
    newEntryLookbackWeeks: 4,
    genreCriteria,
    history: {
      emergingMinDays: 14,
      talkedMinDays: 30,
      highlyTalkedMinDays: 90,
      maxObservationsPerSource: 30,
      heatMinObservationRuns: 12,
      heatRankHigh: 3,
      heatRankNormal: 10,
      heatSourcesHigh: 5,
      heatSourcesNormal: 3,
    },
  }
}

function baseCandidate(overrides: Partial<Candidate>): Candidate {
  return {
    genre: 'music',
    title: 'テストタイトル',
    sourceName: 'Oricon週間チャート',
    sourceUrl: 'https://example.com/a',
    method: 'fixed-list',
    strength: 90,
    rank: 1,
    originRegion: null,
    currentRegions: [],
    strengthJapan: null,
    strengthOverseas: null,
    meetsCriteria: true,
    ...overrides,
  }
}

function baseJudgement(overrides: Partial<HistoryJudgement>): HistoryJudgement {
  return {
    durationLabel: 'pre-trend',
    heatLabel: 'low',
    heatBasis: 'source-position',
    continuationDays: 0,
    continuationStartDate: '2026-09-01',
    detectionCount: 1,
    publishedCount: 0,
    reportCount: 1,
    lastPublishedDurationLabel: null,
    lastPublishedBody: null,
    ...overrides,
  }
}

function candidateWithJudgement(
  candidateOverrides: Partial<Candidate>,
  judgementOverrides: Partial<HistoryJudgement>
): CandidateWithJudgement {
  return { ...baseCandidate(candidateOverrides), judgement: baseJudgement(judgementOverrides) }
}

// 仕様: specs/trend-digest/content-selection/requirements.md#掲載する話題の選び方-4、specs/trend-digest/content-selection/requirements.md#掲載する話題の選び方-5、specs/trend-digest/content-selection/requirements.md#掲載する話題の選び方-6
describe('掲載する話題の並べ替え(compareCandidates) - 未掲載の話題を優先し、未掲載どうし・掲載済みどうしでそれぞれ異なる基準で並べる', () => {
  it('未掲載の話題は、継続度・注目度が掲載済みの話題より低くても掲載済みより先になること', () => {
    const unpublishedWeak = candidateWithJudgement(
      { title: '未掲載の弱い話題' },
      { publishedCount: 0, durationLabel: 'pre-trend', heatLabel: 'low' }
    )
    const publishedStrong = candidateWithJudgement(
      { title: '掲載済みの強い話題' },
      { publishedCount: 3, durationLabel: 'highly-talked', heatLabel: 'high' }
    )
    expect(compareCandidates(unpublishedWeak, publishedStrong)).toBeLessThan(0)
    expect(compareCandidates(publishedStrong, unpublishedWeak)).toBeGreaterThan(0)
  })

  it('未掲載どうしは継続度ラベルが高い順になること', () => {
    const talked = candidateWithJudgement({ title: '話題' }, { durationLabel: 'talked' })
    const emerging = candidateWithJudgement({ title: '注目され始め' }, { durationLabel: 'emerging' })
    expect(compareCandidates(talked, emerging)).toBeLessThan(0)
  })

  it('未掲載どうしは継続度ラベルが同じなら注目度ラベルが高い順になること', () => {
    const high = candidateWithJudgement({ title: '注目度高' }, { durationLabel: 'talked', heatLabel: 'high' })
    const normal = candidateWithJudgement({ title: '注目度普通' }, { durationLabel: 'talked', heatLabel: 'normal' })
    expect(compareCandidates(high, normal)).toBeLessThan(0)
  })

  it('未掲載どうしは継続度・注目度が同じならその回の強さ(strength)が大きい順になること', () => {
    const stronger = candidateWithJudgement({ title: '強い方', strength: 90 }, {})
    const weaker = candidateWithJudgement({ title: '弱い方', strength: 50 }, {})
    expect(compareCandidates(stronger, weaker)).toBeLessThan(0)
  })

  it('掲載済みどうしは注目度ラベルが高い順になること', () => {
    const high = candidateWithJudgement({ title: '注目度高' }, { publishedCount: 1, heatLabel: 'high' })
    const low = candidateWithJudgement({ title: '注目度低' }, { publishedCount: 1, heatLabel: 'low' })
    expect(compareCandidates(high, low)).toBeLessThan(0)
  })

  it('掲載済みどうしは注目度ラベルが同じなら継続度ラベルが高い順になること', () => {
    const talked = candidateWithJudgement({ title: '話題' }, { publishedCount: 1, heatLabel: 'normal', durationLabel: 'talked' })
    const emerging = candidateWithJudgement({ title: '注目され始め' }, { publishedCount: 1, heatLabel: 'normal', durationLabel: 'emerging' })
    expect(compareCandidates(talked, emerging)).toBeLessThan(0)
  })

  it('掲載済みどうしは注目度・継続度が同じなら掲載回数(publishedCount)が少ない順になること', () => {
    const fewer = candidateWithJudgement({ title: '掲載回数少' }, { publishedCount: 1 })
    const more = candidateWithJudgement({ title: '掲載回数多' }, { publishedCount: 5 })
    expect(compareCandidates(fewer, more)).toBeLessThan(0)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#掲載する話題の選び方-8
describe('掲載する話題の並べ替え(compareCandidates) - すべての比較項目が同値のときは決定的な並びになる', () => {
  it('すべての比較項目が同値の話題どうしは正規化タイトルの昇順で並び、入力の順序を変えても結果が変わらないこと', () => {
    const alpha = candidateWithJudgement({ title: 'Alpha' }, {})
    const beta = candidateWithJudgement({ title: 'Beta' }, {})
    expect(compareCandidates(alpha, beta)).toBeLessThan(0)
    expect(compareCandidates(beta, alpha)).toBeGreaterThan(0)

    const sortedAscending = [beta, alpha].sort(compareCandidates).map((c) => c.title)
    const sortedDescendingInput = [alpha, beta].sort(compareCandidates).map((c) => c.title)
    expect(sortedAscending).toEqual(sortedDescendingInput)
    expect(sortedAscending).toEqual(['Alpha', 'Beta'])
  })
})

// 仕様: specs/trend-digest/content-selection/design.md「掲載する話題を選ぶ処理」手順4
describe('掲載する話題の並べ替え(compareCandidates) - ラベルの比較順はtrend-historyのDURATION_LABEL_ORDER・HEAT_LABEL_ORDERを使い、本specで二重に定義しない', () => {
  it('DURATION_LABEL_ORDER上「非常に話題」が最も強いラベルとして扱われること(注目され始め・話題より先になる)', () => {
    const highlyTalked = candidateWithJudgement({ title: '非常に話題' }, { durationLabel: 'highly-talked' })
    const talked = candidateWithJudgement({ title: '話題' }, { durationLabel: 'talked' })
    const emerging = candidateWithJudgement({ title: '注目され始め' }, { durationLabel: 'emerging' })
    const preTrend = candidateWithJudgement({ title: '流行前' }, { durationLabel: 'pre-trend' })
    const sorted = [preTrend, talked, emerging, highlyTalked].sort(compareCandidates).map((c) => c.title)
    expect(sorted).toEqual(['非常に話題', '話題', '注目され始め', '流行前'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#機能要件-5、specs/trend-digest/content-selection/requirements.md#掲載件数-1、specs/trend-digest/content-selection/requirements.md#掲載件数-2
describe('各ジャンル1件の選定(selectEditionTopics) - 対象editionの各ジャンルからちょうど1件を選び、GENRE_ORDER順に並べる', () => {
  const entertainmentGenres: Genre[] = [
    'music', 'japanese-movie', 'foreign-movie', 'japanese-drama', 'foreign-drama',
    'anime', 'variety', 'streaming-video', 'books-comics',
  ]
  const cultureGenres: Genre[] = [
    'sns-buzz', 'buzzwords', 'gourmet', 'hobby', 'fashion', 'gadgets', 'games', 'travel', 'economy-money', 'dev-trends',
  ]

  // ジャンルごとに観測項目1件(採用基準を満たすもの)を持つGenreObservationsと、対応する判定結果を組み立てる
  function observationsWithJudgements(genres: Genre[]): { genreObservations: GenreObservations[]; judgements: JudgementLookup } {
    const judgements: JudgementLookup = new Map()
    const genreObservations: GenreObservations[] = genres.map((genre) => {
      const title = `${genre}-話題`
      judgements.set(normalizeTitle(title), baseJudgement({}))
      return { genre, observations: [baseCandidate({ genre, title, meetsCriteria: true })] }
    })
    return { genreObservations, judgements }
  }

  it('エンタメ編9ジャンルすべてから1件ずつ選ばれ、結果がGENRE_ORDER順に並ぶこと', () => {
    const { genreObservations, judgements } = observationsWithJudgements([...entertainmentGenres].reverse())
    const result = selectEditionTopics(genreObservations, judgements, 'entertainment', baseCriteria())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics).toHaveLength(9)
    expect(result.topics.map((t) => t.genre)).toEqual(entertainmentGenres)
  })

  it('カルチャー・ライフスタイル編10ジャンルすべてから1件ずつ選ばれること(掲載件数の上限は設けない。旧perEditionMaxによる10件打ち切りが残っていないことの回帰テスト)', () => {
    const { genreObservations, judgements } = observationsWithJudgements(cultureGenres)
    const result = selectEditionTopics(genreObservations, judgements, 'culture-lifestyle', baseCriteria())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics).toHaveLength(10)
  })

  it('候補(採用基準を満たした項目)が複数あるジャンルは、候補の中から並べ替え最上位の1件が選ばれること', () => {
    const judgements: JudgementLookup = new Map()
    judgements.set(normalizeTitle('候補A'), baseJudgement({ durationLabel: 'talked' }))
    judgements.set(normalizeTitle('候補B(採用基準を満たさない)'), baseJudgement({ durationLabel: 'highly-talked' }))
    const genreObservations: GenreObservations[] = [
      {
        genre: 'music',
        observations: [
          baseCandidate({ genre: 'music', title: '候補A', meetsCriteria: true }),
          baseCandidate({ genre: 'music', title: '候補B(採用基準を満たさない)', meetsCriteria: false }),
        ],
      },
    ]
    const result = selectEditionTopics(genreObservations, judgements, 'entertainment', baseCriteria())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    // 候補Bの方が継続度ラベルは高いが採用基準を満たしていないため、候補Aが選ばれる
    expect(result.topics.find((t) => t.genre === 'music')?.title).toBe('候補A')
  })

  it('候補が0件で観測項目があるジャンルは、観測項目全体(採用基準を満たさない項目も含む)の中から並べ替え最上位の1件が選ばれること(各ジャンル必ず1件を掲載する回帰テスト)', () => {
    const judgements: JudgementLookup = new Map()
    judgements.set(normalizeTitle('弱い観測項目'), baseJudgement({ durationLabel: 'pre-trend' }))
    judgements.set(normalizeTitle('強い観測項目'), baseJudgement({ durationLabel: 'talked' }))
    const genreObservations: GenreObservations[] = [
      {
        genre: 'music',
        observations: [
          baseCandidate({ genre: 'music', title: '弱い観測項目', meetsCriteria: false }),
          baseCandidate({ genre: 'music', title: '強い観測項目', meetsCriteria: false }),
        ],
      },
    ]
    const result = selectEditionTopics(genreObservations, judgements, 'entertainment', baseCriteria())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics.find((t) => t.genre === 'music')?.title).toBe('強い観測項目')
  })

  it('観測項目が1件もないジャンルはunavailableGenresに入り、topicsには入らないこと(情報源から話題を1件も取得できなかった場合。requirements.md#掲載件数-3)', () => {
    const { genreObservations, judgements } = observationsWithJudgements(entertainmentGenres.filter((g) => g !== 'music'))
    const result = selectEditionTopics(genreObservations, judgements, 'entertainment', baseCriteria())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics).toHaveLength(8)
    expect(result.topics.some((t) => t.genre === 'music')).toBe(false)
    expect(result.unavailableGenres).toEqual(['music'])
  })

  it('対象editionの全ジャンルで観測項目が0件のとき、候補不足によりスキップ結果になること', () => {
    const result = selectEditionTopics([], new Map(), 'entertainment', baseCriteria())
    expect(result.status).toBe('skipped')
  })

  it('1ジャンルでも観測項目があれば、他の全ジャンルが0件でもstatus: okになること', () => {
    const { genreObservations, judgements } = observationsWithJudgements(['music'])
    const result = selectEditionTopics(genreObservations, judgements, 'entertainment', baseCriteria())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics).toHaveLength(1)
    expect(result.unavailableGenres).toHaveLength(8)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#機能要件-6、specs/trend-digest/content-selection/requirements.md#掲載する話題の選び方-7
describe('選定結果へのtrend-history判定結果の添付(selectEditionTopics) - 継続度ラベル・注目度ラベル・継続日数・報告回数・地域情報をトピックに持たせてcontent-generationへ引き渡す', () => {
  it('選ばれたトピックが、判定結果の継続度ラベル・注目度ラベル・継続日数・報告回数・直近掲載時の情報をそのまま持つこと', () => {
    const judgements: JudgementLookup = new Map()
    judgements.set(
      normalizeTitle('music-話題'),
      baseJudgement({
        durationLabel: 'talked',
        heatLabel: 'high',
        continuationDays: 45,
        continuationStartDate: '2026-08-01',
        reportCount: 3,
        lastPublishedDurationLabel: 'emerging',
        lastPublishedBody: '前回の本文',
      })
    )
    const genreObservations: GenreObservations[] = [
      { genre: 'music', observations: [baseCandidate({ genre: 'music', title: 'music-話題', meetsCriteria: true })] },
    ]
    const result = selectEditionTopics(genreObservations, judgements, 'entertainment', baseCriteria())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    const [topic] = result.topics
    expect(topic).toMatchObject({
      durationLabel: 'talked',
      heatLabel: 'high',
      continuationDays: 45,
      continuationStartDate: '2026-08-01',
      reportCount: 3,
      lastPublishedDurationLabel: 'emerging',
      lastPublishedBody: '前回の本文',
    })
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#掲載する話題の選び方-8
describe('同一話題の突き合わせ(selectEditionTopics) - 観測項目のタイトルと判定結果の突き合わせは、前後の空白・全角半角・大文字小文字の違いを吸収する', () => {
  it('観測項目のタイトルが前後の空白・全角半角・大文字小文字違いでも、正規化後に一致する判定結果と正しく結び付くこと', () => {
    const judgements: JudgementLookup = new Map()
    judgements.set(normalizeTitle('abc special edition'), baseJudgement({ durationLabel: 'talked' }))
    const genreObservations: GenreObservations[] = [
      { genre: 'music', observations: [baseCandidate({ genre: 'music', title: '  ＡＢＣ Special Edition  ', meetsCriteria: true })] },
    ]
    const result = selectEditionTopics(genreObservations, judgements, 'entertainment', baseCriteria())
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics.find((t) => t.genre === 'music')?.durationLabel).toBe('talked')
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-12
describe('地域枠(グルメ) - 候補に対象エリアの話題が1件以上あれば、その回のグルメの掲載枠は対象エリアの話題から選ぶ', () => {
  const focusAreasCriteria = baseCriteria({ gourmet: { focusAreas: ['小田原', '茅ヶ崎', '横浜'] } })

  function judgementsFor(titles: string[]): JudgementLookup {
    const judgements: JudgementLookup = new Map()
    for (const title of titles) judgements.set(normalizeTitle(title), baseJudgement({}))
    return judgements
  }

  it('全国の話題の方が強さ(strength)が大きくても、対象エリアの話題が候補にあればそちらが選ばれること', () => {
    const genreObservations: GenreObservations[] = [
      {
        genre: 'gourmet',
        observations: [
          baseCandidate({ genre: 'gourmet', title: '全国の人気店', method: 'websearch', strength: 5, meetsCriteria: true }),
          baseCandidate({ genre: 'gourmet', title: '茅ヶ崎の店', method: 'websearch', strength: 2, area: '茅ヶ崎', meetsCriteria: true }),
        ],
      },
    ]
    const result = selectEditionTopics(
      genreObservations,
      judgementsFor(['全国の人気店', '茅ヶ崎の店']),
      'culture-lifestyle',
      focusAreasCriteria
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics.find((t) => t.genre === 'gourmet')?.title).toBe('茅ヶ崎の店')
  })

  it('対象エリアの話題が候補に複数あれば、その中で通常どおりの並べ替え(strength等)で最上位が選ばれること', () => {
    const genreObservations: GenreObservations[] = [
      {
        genre: 'gourmet',
        observations: [
          baseCandidate({ genre: 'gourmet', title: '横浜の店(弱)', method: 'websearch', strength: 2, area: '横浜', meetsCriteria: true }),
          baseCandidate({ genre: 'gourmet', title: '横浜の店(強)', method: 'websearch', strength: 9, area: '横浜', meetsCriteria: true }),
        ],
      },
    ]
    const result = selectEditionTopics(
      genreObservations,
      judgementsFor(['横浜の店(弱)', '横浜の店(強)']),
      'culture-lifestyle',
      focusAreasCriteria
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics.find((t) => t.genre === 'gourmet')?.title).toBe('横浜の店(強)')
  })

  it('対象エリアの候補が1件もない場合は、通常どおりプール全体から並べ替え最上位が選ばれること', () => {
    const genreObservations: GenreObservations[] = [
      {
        genre: 'gourmet',
        observations: [
          baseCandidate({ genre: 'gourmet', title: '全国A', method: 'websearch', strength: 5, meetsCriteria: true }),
          baseCandidate({ genre: 'gourmet', title: '全国B', method: 'websearch', strength: 4, meetsCriteria: true }),
        ],
      },
    ]
    const result = selectEditionTopics(
      genreObservations,
      judgementsFor(['全国A', '全国B']),
      'culture-lifestyle',
      focusAreasCriteria
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics.find((t) => t.genre === 'gourmet')?.title).toBe('全国A')
  })

  it('対象外の地域名の話題は地域枠として扱われず、対象エリア扱いにならないこと', () => {
    const genreObservations: GenreObservations[] = [
      {
        genre: 'gourmet',
        observations: [
          baseCandidate({ genre: 'gourmet', title: '全国A', method: 'websearch', strength: 5, meetsCriteria: true }),
          baseCandidate({ genre: 'gourmet', title: '札幌の店', method: 'websearch', strength: 9, area: '札幌', meetsCriteria: true }),
        ],
      },
    ]
    const result = selectEditionTopics(
      genreObservations,
      judgementsFor(['全国A', '札幌の店']),
      'culture-lifestyle',
      focusAreasCriteria
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    // 札幌はfocusAreas対象外のため地域枠が働かず、通常の並べ替え(strength)で札幌の店が選ばれる
    // (地域枠自体が適用されないだけで、札幌の話題を候補から排除するわけではない)
    expect(result.topics.find((t) => t.genre === 'gourmet')?.title).toBe('札幌の店')
  })

  it('focusAreas未指定のジャンルでは地域による優先は行われず、通常どおり並べ替え最上位が選ばれること', () => {
    const genreObservations: GenreObservations[] = [
      {
        genre: 'gourmet',
        observations: [
          baseCandidate({ genre: 'gourmet', title: '全国A', method: 'websearch', strength: 5, meetsCriteria: true }),
          baseCandidate({ genre: 'gourmet', title: '茅ヶ崎の店', method: 'websearch', strength: 2, area: '茅ヶ崎', meetsCriteria: true }),
        ],
      },
    ]
    const result = selectEditionTopics(
      genreObservations,
      judgementsFor(['全国A', '茅ヶ崎の店']),
      'culture-lifestyle',
      baseCriteria() // gourmetにfocusAreasを設定しない
    )
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics.find((t) => t.genre === 'gourmet')?.title).toBe('全国A')
  })
})
