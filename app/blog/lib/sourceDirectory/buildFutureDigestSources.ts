import { getActiveGenres, type GenreConfig } from '../../../future-digest/lib/genres'
import type { SourceDirectoryRow } from './types'

// future-digestは固定リストの情報源を持たず、ジャンルの説明・注目テーマを手がかりにClaude Code CLIが
// WebSearchで候補を探す(仕様: design.md「アプリごとの表示行を組み立てる処置」手順4)。選定方式は
// WebSearch固定、採用基準は両アプリ採用基準を数値データ化していないため固定文言で表示する
// (design.md決定事項「future-digest/research-digestの選定方式・採用基準の表示」)
const CRITERIA_TEXT =
  '研究機関・シンクタンク・国際機関・報道機関・専門家等が公開した出典明確な予測・考察のうち、影響度が最も大きい候補1本を採用する(Claude自身の推測は候補にしない)'

export function buildFutureDigestSources(genres: GenreConfig[]): SourceDirectoryRow[] {
  return getActiveGenres(genres).map((genre) => ({
    genreLabel: genre.label,
    methodLabel: 'WebSearch',
    criteriaText: CRITERIA_TEXT,
    sources: [],
    // 個人的注目分野ジャンルのみthemesを検索の手がかりにする(design.md手順4)
    searchHints: genre.themes ?? [genre.description],
  }))
}
