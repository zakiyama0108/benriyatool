import type { Genre } from './types'
import { GENRE_ORDER } from './types'
import type { Candidate, SelectionResult } from './candidateTypes'
import type { Criteria } from './watchlistTypes'

// 掲載済み話題の除外・ジャンル内の絞り込み・編全体の絞り込み(仕様: requirements.md#掲載済み話題の再掲抑制-1、
// requirements.md#機能要件-4、requirements.md#機能要件-5、design.md「掲載済み話題を除外する処理」
// 「ジャンル内の絞り込みを行う処理」「編全体の絞り込みを行う処理」)。入出力が純粋なデータのみのため
// 通常のvitestで完全にテストできる

// 掲載済み話題の再掲抑制用にタイトルを正規化する(design.md「掲載済み話題を除外する処理」手順2)。
// 前後の空白除去・全角/半角の統一(NFKC正規化)・英字の大文字小文字統一を行う
export function normalizeTitle(title: string): string {
  return title.trim().normalize('NFKC').toLowerCase()
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
