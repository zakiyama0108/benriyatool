import type { Edition, Genre } from './types'
import { GENRE_ORDER } from './types'
import type { Candidate, SelectedTopic, SelectionResult } from './candidateTypes'
import type { HistoryJudgement } from './historyTypes'
import { DURATION_LABEL_ORDER, HEAT_LABEL_ORDER } from './historyTypes'

// 掲載する話題の並べ替え・各ジャンル1件の選定(仕様: requirements.md#掲載する話題の選び方-4〜8、
// design.md「掲載する話題を選ぶ処理」)。入出力が純粋なデータのみのため通常のvitestで完全にテストできる

// 同一話題かどうかの判定・タイトルの表示用突合キーとしてタイトルを正規化する
// (requirements.md#掲載する話題の選び方-8、design.md「掲載する話題を選ぶ処理」手順8)。
// trend-history(aggregateHistory.ts)と同じ正規化ルールを共用する(二重に持たない)。
// 前後の空白除去・全角/半角の統一(NFKC正規化)・英字の大文字小文字統一を行う
export function normalizeTitle(title: string): string {
  return title.trim().normalize('NFKC').toLowerCase()
}

// trend-historyが判定した継続度ラベル・注目度ラベル・掲載実績を添えた候補(design.md「掲載する話題を選ぶ処理」)。
// ラベルの判定自体はtrend-history(Task6〜8)が行い、ここでは受け取った結果を比較するだけ
export type CandidateWithJudgement = Candidate & { judgement: HistoryJudgement }

// 掲載する話題の並べ替え(requirements.md#掲載する話題の選び方-4〜6・-8、design.md「掲載する話題を選ぶ処理」手順4)。
// 昇順の比較関数として使う(戻り値が負ならaを先にする)。次の3階層+タイブレークで比較する:
//   1. 過去に一度も掲載したことがない話題(publishedCount=0)を、掲載したことがある話題より先にする
//   2. 未掲載どうしは継続度ラベルが高い順→注目度ラベルが高い順→その回の強さ(strength)が大きい順
//   3. 掲載済みどうしは注目度ラベルが高い順→継続度ラベルが高い順→掲載回数(publishedCount)が少ない順
//   4. ここまで同値なら正規化タイトルの昇順(同点のときに選ばれる話題が実行のたびに変わらないようにするため)
export function compareCandidates(a: CandidateWithJudgement, b: CandidateWithJudgement): number {
  const aPublished = a.judgement.publishedCount > 0
  const bPublished = b.judgement.publishedCount > 0
  if (aPublished !== bPublished) return aPublished ? 1 : -1

  let diff: number
  if (!aPublished) {
    diff = DURATION_LABEL_ORDER[b.judgement.durationLabel] - DURATION_LABEL_ORDER[a.judgement.durationLabel]
    if (diff !== 0) return diff
    diff = HEAT_LABEL_ORDER[b.judgement.heatLabel] - HEAT_LABEL_ORDER[a.judgement.heatLabel]
    if (diff !== 0) return diff
    diff = b.strength - a.strength
    if (diff !== 0) return diff
  } else {
    diff = HEAT_LABEL_ORDER[b.judgement.heatLabel] - HEAT_LABEL_ORDER[a.judgement.heatLabel]
    if (diff !== 0) return diff
    diff = DURATION_LABEL_ORDER[b.judgement.durationLabel] - DURATION_LABEL_ORDER[a.judgement.durationLabel]
    if (diff !== 0) return diff
    diff = a.judgement.publishedCount - b.judgement.publishedCount
    if (diff !== 0) return diff
  }

  return normalizeTitle(a.title).localeCompare(normalizeTitle(b.title))
}

// 1ジャンル分のその回の観測項目(採用基準の判定前の全件。design.md「掲載する話題を選ぶ処理」対象)。
// 候補(meetsCriteria: true)と候補にならなかった項目の両方を持つ
export type GenreObservations = {
  genre: Genre
  observations: Candidate[]
}

// 観測項目1件ぶんのtrend-history判定結果を引くための辞書。キーはnormalizeTitle済みのタイトル
// (trend-historyがその回の全観測項目について判定結果を返す前提。design.md「全観測項目を履歴へ記録する処理」手順3)
export type JudgementLookup = Map<string, HistoryJudgement>

function attachJudgement(candidate: Candidate, judgements: JudgementLookup): CandidateWithJudgement {
  const judgement = judgements.get(normalizeTitle(candidate.title))
  if (!judgement) {
    // trend-historyはその回にcontent-selectionから渡された全観測項目の判定結果を返す前提であり、
    // ここに来る場合はパイプラインの不具合(観測項目の記録漏れ等)を示す
    throw new Error(
      `観測項目「${candidate.title}」(ジャンル: ${candidate.genre})の判定結果が見つかりません。` +
        'trend-historyがこの回の全観測項目分の判定結果を返しているか確認してください'
    )
  }
  return { ...candidate, judgement }
}

// CandidateWithJudgementから、記事に載せる1件分のSelectedTopicを組み立てる
function toSelectedTopic(candidate: CandidateWithJudgement): SelectedTopic {
  const { judgement, ...rest } = candidate
  return {
    ...rest,
    durationLabel: judgement.durationLabel,
    heatLabel: judgement.heatLabel,
    continuationDays: judgement.continuationDays,
    continuationStartDate: judgement.continuationStartDate,
    reportCount: judgement.reportCount,
    lastPublishedDurationLabel: judgement.lastPublishedDurationLabel,
    lastPublishedBody: judgement.lastPublishedBody,
  }
}

// 対象editionの各ジャンルから1件を選ぶ(requirements.md#機能要件-5、requirements.md#掲載件数-1〜3、
// design.md「掲載する話題を選ぶ処理」)。genreObservationsに含まれないジャンル、または
// observationsが空のジャンルは、情報源から項目を1件も取得できなかったジャンルとしてunavailableGenresに入る
export function selectEditionTopics(
  genreObservations: GenreObservations[],
  judgements: JudgementLookup,
  edition: Edition
): SelectionResult {
  const order = GENRE_ORDER[edition]
  const topics: SelectedTopic[] = []
  const unavailableGenres: Genre[] = []

  for (const genre of order) {
    const observations = genreObservations.find((g) => g.genre === genre)?.observations ?? []
    if (observations.length === 0) {
      // 情報源から項目を1件も取得できなかったジャンル(requirements.md#掲載件数-3)。架空の話題は作らない
      unavailableGenres.push(genre)
      continue
    }

    const withJudgement = observations.map((candidate) => attachJudgement(candidate, judgements))
    // 手順1: 採用基準を満たした項目(候補)があれば候補だけから選ぶ。候補が0件なら観測項目全体から選ぶ
    // (各ジャンルから必ず1件を掲載するため。requirements.md#掲載件数-1)
    const candidatesOnly = withJudgement.filter((candidate) => candidate.meetsCriteria)
    const pool = candidatesOnly.length > 0 ? candidatesOnly : withJudgement

    const [best] = [...pool].sort(compareCandidates)
    topics.push(toSelectedTopic(best))
  }

  // 手順7: 対象editionのすべてのジャンルで項目を1件も取得できなかった場合のみスキップとする
  if (topics.length === 0) {
    return {
      status: 'skipped',
      edition,
      reason: `対象edition(${edition})の全${order.length}ジャンルで情報源から項目を1件も取得できませんでした`,
    }
  }

  // topicsは手順6のとおりGENRE_ORDER順(このforループの反復順)にすでに並んでいる
  return { status: 'ok', edition, topics, unavailableGenres }
}
