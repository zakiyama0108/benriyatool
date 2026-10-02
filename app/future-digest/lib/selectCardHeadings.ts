import type { Article, Impact } from './types'
import { GENRE_ORDER, HORIZON_ORDER, IMPACT_ORDER } from './types'

const MAX_HEADINGS = 3

export type CardHeading = {
  heading: string
  impact: Impact
}

// 一覧カードに載せる見出し最大3件を選ぶ(仕様: requirements.md#一覧表示-2〜4、
// design.md「各回に載せる見出しを選ぶ処理」)。予測を影響度の大きい順(同じ影響度は
// ジャンル順→時間軸の近い順)に並べ、先頭から最大3件を選ぶ。「大」が3件以上あれば
// 「大」だけが選ばれ、「大」が3件未満なら「中」「小」で補われる。掲載できなかった枠
// (emptySlots)は対象外。性・恋愛ジャンルの予測も他のジャンルと同じ扱いで選ぶ(ジャンルIDで
// 区別する分岐を設けない)
export function selectCardHeadings(article: Article): CardHeading[] {
  const sorted = [...article.predictions].sort((a, b) => {
    const impactDiff = IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)
    if (impactDiff !== 0) return impactDiff
    const genreDiff = GENRE_ORDER.indexOf(a.genre) - GENRE_ORDER.indexOf(b.genre)
    if (genreDiff !== 0) return genreDiff
    return HORIZON_ORDER.indexOf(a.horizon) - HORIZON_ORDER.indexOf(b.horizon)
  })

  return sorted.slice(0, MAX_HEADINGS).map((prediction) => ({ heading: prediction.heading, impact: prediction.impact }))
}
