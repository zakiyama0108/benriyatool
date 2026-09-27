import type { Genre } from './types'
import { GENRE_ORDER } from './types'
import type { Candidate, SelectionResult } from './candidateTypes'
import type { Criteria } from './watchlistTypes'
import type { HistoryJudgement } from './historyTypes'
import { DURATION_LABEL_ORDER, HEAT_LABEL_ORDER } from './historyTypes'

// 掲載済み話題の除外・ジャンル内の絞り込み・編全体の絞り込み(仕様: requirements.md#掲載済み話題の再掲抑制-1、
// requirements.md#機能要件-4、requirements.md#機能要件-5、design.md「掲載済み話題を除外する処理」
// 「ジャンル内の絞り込みを行う処理」「編全体の絞り込みを行う処理」)。入出力が純粋なデータのみのため
// 通常のvitestで完全にテストできる

// 掲載済み話題の再掲抑制用にタイトルを正規化する(design.md「掲載済み話題を除外する処理」手順2)。
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

// 過去に掲載済みのトピック(同一作品名・同一話題)を、採用基準を満たしていても候補から除外する
// (requirements.md#掲載済み話題の再掲抑制-1)。publishedTitlesは呼び出し元
// (scripts/trend-digest/collect-and-select.ts)がcontent/trend-digest/articles/*.jsonの
// 全記事のsourceTitleを集めたもの(期間で絞らない)
export function excludeAlreadyPublishedTopics(candidates: Candidate[], publishedTitles: Set<string>): Candidate[] {
  const normalizedPublished = new Set([...publishedTitles].map(normalizeTitle))
  return candidates.filter((candidate) => !normalizedPublished.has(normalizeTitle(candidate.title)))
}

// ジャンル内の絞り込み(1ジャンル最大2件。requirements.md#機能要件-4、
// requirements.md#ジャンル内の絞り込み(1ジャンル最大2件)-1〜2、design.md「ジャンル内の絞り込みを行う処理」)。
// strength降順に並べ、3件以上あれば上位2件に絞る。0〜2件はそのまま採用する
export function narrowGenreCandidates(candidates: Candidate[], perGenreMax: number): Candidate[] {
  return [...candidates].sort((a, b) => b.strength - a.strength).slice(0, perGenreMax)
}

// 編全体の絞り込みの入力単位。narrowGenreCandidates適用後(strength降順、最大2件)の
// 1ジャンル分の候補と、絞り込みの優先順位付け(design.md#編全体の絞り込みを行う処理-手順2)に使うmethodを持つ
export type GenreCandidateEntry = {
  genre: Genre
  method: 'fixed-list' | 'websearch'
  candidates: Candidate[]
}

// 編全体の絞り込み(1回最大10件。requirements.md#機能要件-5、
// requirements.md#配信全体の絞り込み(1回最大10件)-1、design.md「編全体の絞り込みを行う処理」)。
// genreEntriesはwatchlist.json登録順(手順2の「固定リストジャンル→WebSearchジャンル」の順序決定に使う)で渡す
export function selectEditionTopics(
  genreEntries: GenreCandidateEntry[],
  criteria: Criteria,
  edition: 'entertainment' | 'culture-lifestyle'
): SelectionResult {
  // 手順1: 各ジャンルの1件目(最有力候補)をすべて先に採用する
  const firstPlace = genreEntries.map((entry) => entry.candidates[0]).filter((c): c is Candidate => Boolean(c))
  const selected: Candidate[] = [...firstPlace]

  // 手順2: 採用件数がperEditionMaxを超えない範囲で、各ジャンルの2件目を
  // 「固定リストジャンル→WebSearchジャンル」の順(ジャンルはwatchlist.json登録順)に1件ずつ追加する
  const secondPlaceOrder = [
    ...genreEntries.filter((entry) => entry.method === 'fixed-list'),
    ...genreEntries.filter((entry) => entry.method === 'websearch'),
  ]
  for (const entry of secondPlaceOrder) {
    if (selected.length >= criteria.perEditionMax) break
    const second = entry.candidates[1]
    if (second) selected.push(second)
  }

  // 手順4: 対象9ジャンルすべてで候補が1件も残らなかった場合のみスキップとする
  if (selected.length === 0) {
    return { status: 'skipped', edition, reason: '対象9ジャンルすべてで候補が0件でした' }
  }

  // 手順3: 採用された候補を、そのeditionの9ジャンルの定義順(GENRE_ORDER)に並べ替える
  const order = GENRE_ORDER[edition]
  const topics = [...selected].sort((a, b) => order.indexOf(a.genre) - order.indexOf(b.genre))

  return { status: 'ok', edition, topics }
}
