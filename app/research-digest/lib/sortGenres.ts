import type { Article, EmptyGenre, Finding, Genre } from './types'
import { GENRE_ORDER, IMPACT_ORDER } from './types'

// 掲載した研究と掲載できなかったジャンルを1つの「ジャンル枠」として扱うための型
// (design.md「表示するジャンルの一覧を組み立てる処理」)
export type GenreEntry =
  | { genre: Genre; kind: 'finding'; finding: Finding }
  | { genre: Genre; kind: 'empty'; emptyGenre: EmptyGenre }

export type SortOrder = 'impact' | 'genre'

// 定義にないジャンルは末尾に回す(過去記事の表示を壊さないため)
function genreIndex(genre: Genre): number {
  const index = GENRE_ORDER.indexOf(genre)
  return index === -1 ? GENRE_ORDER.length : index
}

function compareByGenreOrder(a: GenreEntry, b: GenreEntry): number {
  return genreIndex(a.genre) - genreIndex(b.genre)
}

// ジャンル枠の一覧を組み立て、並び順に従って並べ替える(仕様: requirements.md#記事本文の表示-6、
// requirements.md#並び順の切り替え-8〜9、design.md「表示するジャンルの一覧を組み立てる処理」)
export function sortGenres(article: Article, order: SortOrder): GenreEntry[] {
  const findings: GenreEntry[] = article.findings.map((finding) => ({
    genre: finding.genre,
    kind: 'finding',
    finding,
  }))
  const empties: GenreEntry[] = article.emptyGenres.map((emptyGenre) => ({
    genre: emptyGenre.genre,
    kind: 'empty',
    emptyGenre,
  }))

  if (order === 'genre') {
    return [...findings, ...empties].sort(compareByGenreOrder)
  }

  // 影響度順: 研究を大→中→小、同じ影響度の中ではジャンル順。掲載できなかったジャンルは末尾にジャンル順
  findings.sort((a, b) => {
    if (a.kind !== 'finding' || b.kind !== 'finding') return 0
    const diff = IMPACT_ORDER.indexOf(a.finding.impact) - IMPACT_ORDER.indexOf(b.finding.impact)
    return diff !== 0 ? diff : compareByGenreOrder(a, b)
  })
  empties.sort(compareByGenreOrder)
  return [...findings, ...empties]
}
