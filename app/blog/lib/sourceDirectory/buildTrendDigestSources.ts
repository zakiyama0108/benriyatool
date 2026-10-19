import { buildSourceDirectory } from '../../../trend-digest/lib/buildSourceDirectory'
import type { WatchlistEntry, Criteria } from '../../../trend-digest/lib/watchlistTypes'
import type { SourceDirectoryRow } from './types'

// trend-digestは既存のbuildSourceDirectory(編ごとのジャンル・情報源・採用基準を組み立てる処理)を
// そのまま呼ぶだけで、ロジックを複製しない(仕様: design.md決定事項「trend-digestの表示行の組み立て」)。
// 既存実装の戻り値はeditionLabelが常にstring(必須)だが、共通型SourceDirectoryRowではoptionalの
// ため、そのまま代入しても型上問題なく一致する
export function buildTrendDigestSources(watchlist: WatchlistEntry[], criteria: Criteria): SourceDirectoryRow[] {
  return buildSourceDirectory(watchlist, criteria)
}
