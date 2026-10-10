import { getActiveGenres, type GenreConfig } from '../../../research-digest/lib/genres'
import type { SourceDirectoryRow } from './types'

// research-digestもfuture-digestと同じ方針(仕様: design.md決定事項「future-digest/research-digest
// の選定方式・採用基準の表示」)。固定リストの情報源を持たないため、ジャンルのdescriptionを
// 検索の手がかりとして表示する(research-digestはthemesを持つジャンルがないため常にdescription)
const CRITERIA_TEXT =
  '学術誌掲載論文、または大学・研究機関の公式発表を出典とする研究のうち、影響度が最も大きい候補1本を採用する(出典を確かめられない話題・宣伝目的の発表は候補にしない)'

export function buildResearchDigestSources(genres: GenreConfig[]): SourceDirectoryRow[] {
  return getActiveGenres(genres).map((genre) => ({
    genreLabel: genre.label,
    methodLabel: 'WebSearch',
    criteriaText: CRITERIA_TEXT,
    sources: [],
    searchHints: [genre.description],
  }))
}
