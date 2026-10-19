// 情報源一覧(運営者専用)ページの表示行の組み立て(仕様: design.md「表示する行を組み立てる処理」
// 「採用基準を日本語にする処理」)。watchlist.json・criteria.jsonの値から表示用の文言を導出する
// 純粋関数のみを持ち、このページ用のデータを別に持たない(requirements.md#機能要件-5)

import type { Edition } from './types'
import { GENRE_ORDER, GENRE_LABELS } from './types'
import type {
  Criteria,
  GenreCriteria,
  FixedListGenreCriteria,
  WebSearchGenreCriteria,
  HybridGenreCriteria,
  SelectionMethod,
  SourceRegion,
  WatchlistEntry,
} from './watchlistTypes'

// 情報源1件分の表示用の値(design.md「コンポーネント設計」)。地域区分は日本語に変換済み
export type SourceDirectorySourceItem = {
  name: string
  url: string
  regionLabel: string // '日本' | '海外'
}

// ジャンル1件分の表示行(design.md「コンポーネント設計」)。固定リストジャンルはsourcesのみ、
// WebSearchジャンルはsearchHintsのみ、併用ジャンルは両方に値が入る(片方しか使わないジャンルは
// もう片方を空配列にする)。表示に使う文言はすべてこの型の時点で確定させ、画面側で加工しない
export type SourceDirectoryRow = {
  genreLabel: string
  editionLabel: string
  methodLabel: string
  criteriaText: string
  sources: SourceDirectorySourceItem[]
  searchHints: string[]
}

// エンタメ編を先・カルチャー・ライフスタイル編を後にする表示順(requirements.md#表示の順序-6)
export const EDITIONS: Edition[] = ['entertainment', 'culture-lifestyle']

// 固定リストジャンルの採用基準を日本語にする(design.md「採用基準を日本語にする処理」手順1〜3)
function buildFixedListCriteriaText(c: Omit<FixedListGenreCriteria, 'method'>): string {
  const hasRank = c.rankThreshold !== undefined
  const hasRising = c.newEntryOrRisingRank === true

  const risingText = c.risingRankMinImprovement !== undefined
    ? `新規ランクイン、または順位が${c.risingRankMinImprovement}位以上上昇`
    : '新規ランクイン、または順位上昇'

  if (hasRank && hasRising) {
    return `上位${c.rankThreshold}位以内、かつ${risingText}`
  }
  if (hasRank) {
    return `上位${c.rankThreshold}位以内`
  }
  if (hasRising) {
    return risingText
  }
  throw new Error('固定リストジャンルの採用基準にrankThreshold・newEntryOrRisingRankのいずれも設定されていません')
}

// WebSearchジャンルの採用基準を日本語にする(design.md「採用基準を日本語にする処理」手順4)
function buildWebSearchCriteriaText(c: Omit<WebSearchGenreCriteria, 'method'>): string {
  return `独立した言及元が${c.minIndependentSources}件以上`
}

// 併用ジャンルの採用基準を日本語にする(design.md「採用基準を日本語にする処理」手順5、
// requirements.md#機能要件-6)。固定リスト側の文言に続けて、いずれか一方を満たせば候補になる
// OR条件であることが伝わるようWebSearch側の条件を添える
function buildHybridCriteriaText(c: HybridGenreCriteria): string {
  return `${buildFixedListCriteriaText(c.fixedList)}、またはWebSearchで${buildWebSearchCriteriaText(c.webSearch)}`
}

// 採用基準の定義から表示用の文言を組み立てる(design.md「採用基準を日本語にする処理」)。
// 文言は採用基準の値から都度導出し、ジャンルごとの固定文をこのファイルに書き込まない
// (requirements.md#機能要件-5)
export function buildCriteriaText(criteria: GenreCriteria): string {
  switch (criteria.method) {
    case 'fixed-list':
      return buildFixedListCriteriaText(criteria)
    case 'websearch':
      return buildWebSearchCriteriaText(criteria)
    case 'hybrid':
      return buildHybridCriteriaText(criteria)
  }
}

// 選定方式の日本語表記(design.md「画面設計」)。hybridは固定リストとWebSearchを併用する
// 併用ジャンル専用の表記(requirements.md#機能要件-6)
const METHOD_LABELS: Record<SelectionMethod, string> = {
  'fixed-list': '固定リスト',
  websearch: 'WebSearch',
  hybrid: '固定リスト+WebSearch',
}

// 編の日本語表記(design.md「画面設計」)
const EDITION_LABELS: Record<Edition, string> = {
  entertainment: 'エンタメ編',
  'culture-lifestyle': 'カルチャー・ライフスタイル編',
}

// 情報源の地域区分の日本語表記(design.md「画面設計」)
const REGION_LABELS: Record<SourceRegion, string> = {
  japan: '日本',
  overseas: '海外',
}

// watchlist.json・criteria.jsonから表示行を組み立てる(design.md「表示する行を組み立てる処理」)。
// GENRE_ORDERの順(エンタメ編→カルチャー・ライフスタイル編、編の中は記事の見出し表示順)で
// 行を並べるため、watchlist.json自体の登録順には依存しない(requirements.md#表示の順序-6)。
// 表示行はwatchlist.json・criteria.jsonの値をそのまま写すだけで、別のデータを作らない
// (requirements.md#機能要件-5)
export function buildSourceDirectory(watchlist: WatchlistEntry[], criteria: Criteria): SourceDirectoryRow[] {
  const rows: SourceDirectoryRow[] = []

  for (const edition of EDITIONS) {
    for (const genre of GENRE_ORDER[edition]) {
      const entry = watchlist.find((w) => w.genre === genre)
      if (!entry) {
        throw new Error(`watchlist.jsonにジャンル(${genre})の情報源が定義されていません`)
      }
      const genreCriteria = criteria.genreCriteria[genre]
      if (!genreCriteria) {
        throw new Error(`criteria.jsonにジャンル(${genre})の採用基準が定義されていません`)
      }

      rows.push({
        genreLabel: GENRE_LABELS[genre],
        editionLabel: EDITION_LABELS[edition],
        methodLabel: METHOD_LABELS[entry.method],
        criteriaText: buildCriteriaText(genreCriteria),
        sources: entry.sources.map((source) => ({
          name: source.name,
          url: source.url,
          regionLabel: REGION_LABELS[source.region],
        })),
        searchHints: entry.searchHints ?? [],
      })
    }
  }

  return rows
}
