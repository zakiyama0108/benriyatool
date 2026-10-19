import { describe, it, expect } from 'vitest'
import { buildTrendDigestSources } from '../../../../app/blog/lib/sourceDirectory/buildTrendDigestSources'
import { buildSourceDirectory } from '../../../../app/trend-digest/lib/buildSourceDirectory'
import watchlistData from '../../../../content/trend-digest/watchlist.json'
import criteriaData from '../../../../content/trend-digest/criteria.json'
import type { WatchlistEntry, Criteria } from '../../../../app/trend-digest/lib/watchlistTypes'

const watchlist = watchlistData.genres as WatchlistEntry[]
const criteria = criteriaData as Criteria

// 仕様: specs/blog/source-directory/design.md#決定事項-trend-digestの表示行の組み立て
describe('trend-digestの情報源一覧の表示行 - 既存のbuildSourceDirectoryをそのまま使い、ロジックを複製しない', () => {
  it('既存のwatchlist.json・criteria.jsonを渡した結果が、既存のbuildSourceDirectoryと同じ内容になること', () => {
    const rows = buildTrendDigestSources(watchlist, criteria)
    const expected = buildSourceDirectory(watchlist, criteria)
    expect(rows).toEqual(expected)
  })

  it('既存実装どおり、編の区別(editionLabel)を持つ行が生成されること', () => {
    const rows = buildTrendDigestSources(watchlist, criteria)
    expect(rows.every((row) => typeof row.editionLabel === 'string' && row.editionLabel.length > 0)).toBe(true)
  })
})
