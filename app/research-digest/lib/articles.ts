import fs from 'node:fs'
import path from 'node:path'
import type { Article } from './types'
import { parseArticle } from './articleSchema'

// content/research-digest/articles/ を既定の格納場所とする(article-detail/design.md「前提: 記事データの形式」)。
// content-selectionの過去記事読み込み(検証付き)が依存するため、article-detailに先立って置いている。
// __tests__からはフィクスチャ用ディレクトリを明示的に渡してテストする
const DEFAULT_ARTICLES_DIR = path.join(process.cwd(), 'content/research-digest/articles')

// 指定ディレクトリ配下の記事データをすべて読み込み、発行日の新しい順に返す。
// ディレクトリ自体が存在しない場合は「運用開始直後で記事が1件もない」状態として空配列を返す。
// JSONのパース・スキーマ違反は例外として呼び出し元に伝播させ、壊れたデータのまま処理が進む事故を防ぐ
export function getAllArticles(dir: string = DEFAULT_ARTICLES_DIR): Article[] {
  if (!fs.existsSync(dir)) return []

  const filenames = fs.readdirSync(dir).filter((name) => name.endsWith('.json'))
  const articles = filenames.map((filename) => {
    const raw: unknown = JSON.parse(fs.readFileSync(path.join(dir, filename), 'utf8'))
    return parseArticle(raw, filename)
  })

  return articles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

// 指定したIDの記事を1件返す。該当ファイルが存在しないIDは「記事なし」を表すnullを返す
export function getArticleById(id: string, dir: string = DEFAULT_ARTICLES_DIR): Article | null {
  const filePath = path.join(dir, `${id}.json`)
  if (!fs.existsSync(filePath)) return null

  const raw: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return parseArticle(raw, `${id}.json`)
}
