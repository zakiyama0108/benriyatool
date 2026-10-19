// content/trend-digest/articles/配下の過去記事読み込み(仕様: design.md「固定リストジャンルの候補を収集・
// 判定する処理」手順3)。TDD対象外(ファイルシステムを直接読むだけの薄いI/Oのため。ai-dev-digestの
// 既存scriptsと同じ考え方)。collect-and-select.tsから利用する
import fs from 'node:fs'
import path from 'node:path'
import type { Article } from '../../app/trend-digest/lib/types'

const ARTICLES_DIR = path.join(process.cwd(), 'content/trend-digest/articles')

export function readAllArticles(): Article[] {
  if (!fs.existsSync(ARTICLES_DIR)) return []
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8')) as Article)
}

// 新規ランクイン判定用に、直近weeks週間分の過去記事の掲載トピックのsourceTitle(正規化後)を集める
// (design.md「固定リストジャンルの候補を収集・判定する処理」手順3)
export function collectRecentPublishedNormalizedTitles(
  articles: Article[],
  weeks: number,
  normalizeTitle: (title: string) => string
): Set<string> {
  const cutoff = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000
  const titles = new Set<string>()
  for (const article of articles) {
    if (new Date(article.date).getTime() < cutoff) continue
    for (const topic of article.topics) titles.add(normalizeTitle(topic.sourceTitle))
  }
  return titles
}
