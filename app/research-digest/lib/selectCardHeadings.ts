import type { Article, Genre, Impact } from './types'
import { GENRE_ORDER, IMPACT_ORDER } from './types'

const MAX_HEADINGS = 3

export type CardHeading = {
  genre: Genre
  heading: string
  impact: Impact
  isPreprint: boolean // 査読前の論文は一覧でも「査読前」のバッジを出すため
}

// 定義にないジャンルは末尾に回す(過去記事の表示を壊さないため。sortGenres.tsと同じ扱い)
function genreIndex(genre: Genre): number {
  const index = GENRE_ORDER.indexOf(genre)
  return index === -1 ? GENRE_ORDER.length : index
}

// 一覧カードに載せる見出し最大3件を選ぶ(仕様: article-list/requirements.md#一覧表示-2〜3、
// article-list/design.md「各回に載せる見出しを選ぶ処理」)。研究を影響度の大きい順(同じ影響度は
// ジャンル順)に並べ、先頭から最大3件を選ぶ。「大」が3件以上あれば「大」だけが選ばれ、
// 「大」が3件未満なら「中」「小」で補われる。掲載できなかったジャンル(emptyGenres)は対象外
export function selectCardHeadings(article: Article): CardHeading[] {
  const sorted = [...article.findings].sort((a, b) => {
    const impactDiff = IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)
    return impactDiff !== 0 ? impactDiff : genreIndex(a.genre) - genreIndex(b.genre)
  })

  return sorted.slice(0, MAX_HEADINGS).map((finding) => ({
    genre: finding.genre,
    heading: finding.heading,
    impact: finding.impact,
    isPreprint: finding.isPreprint,
  }))
}
