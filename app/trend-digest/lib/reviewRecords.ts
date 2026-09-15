import fs from 'node:fs'
import path from 'node:path'
import type { Edition, Genre } from './types'
import { GENRE_ORDER } from './types'
import { parseArticle } from './articleSchema'

// 月次見直しの材料集め(仕様: source-review/requirements.md#見直しの実行-1、
// design.md「見直しの材料を集める処理」)。
// design.mdは本ロジックをscripts/trend-digest/collect-review-data/collectReviewData.tsに
// 置く想定だが、そのディレクトリは独立した依存関係(pg/dotenv)を持つ隔離パッケージのため
// 本体のtsconfigプロジェクトに含まれない(tsconfig.json参照)。DB非依存のこのロジック自体は
// 本体のvitestで完全にテストできるため、テスト可能性を保つ目的でapp/trend-digest/lib/に置き、
// 隔離パッケージ側からはこのモジュールをimportして薄いCLIとして呼び出す
// (ai-dev-digestのapp/ai-dev-digest/lib/reviewRecords.tsと同じ設計判断)

export type SkippedGenreRecord = {
  date: string
  edition: Edition
  genre: Genre
}

// articlesDir配下の記事データのうち、sinceDate以降の日付を対象に、GENRE_ORDER上のジャンルで
// topicsに現れなかったものを列挙する(design.md「見直しの材料を集める処理」手順1、
// content-selection/requirements.md#情報源の健全性監視-1)。
// 記事データがまだ1件もない運用開始直後は空配列を返す
export function collectSkippedGenres(articlesDir: string, sinceDate: string): SkippedGenreRecord[] {
  if (!fs.existsSync(articlesDir)) return []

  const filenames = fs.readdirSync(articlesDir).filter((name) => name.endsWith('.json'))
  const records: SkippedGenreRecord[] = []

  for (const filename of filenames) {
    const raw: unknown = JSON.parse(fs.readFileSync(path.join(articlesDir, filename), 'utf8'))
    const article = parseArticle(raw, filename)
    if (article.date < sinceDate) continue

    const coveredGenres = new Set(article.topics.map((topic) => topic.genre))
    for (const genre of GENRE_ORDER[article.edition]) {
      if (!coveredGenres.has(genre)) {
        records.push({ date: article.date, edition: article.edition, genre })
      }
    }
  }

  return records.sort((a, b) => (a.date < b.date ? 1 : -1))
}
