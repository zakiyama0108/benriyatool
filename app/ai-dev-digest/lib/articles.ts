import fs from 'node:fs'
import path from 'node:path'
import type { Article } from './types'
import { parseArticle } from './articleSchema'

// content/ai-dev-digest/articles/ を既定の格納場所とする(design.md「前提: 記事データの形式」)。
// __tests__からはフィクスチャ用ディレクトリを明示的に渡してテストする(Task4)
const DEFAULT_ARTICLES_DIR = path.join(process.cwd(), 'content/ai-dev-digest/articles')

// 指定ディレクトリ配下の記事データをすべて読み込み、日付の新しい順に返す。
// ディレクトリ自体が存在しない場合は「運用開始直後で記事が1件もない」状態として
// 空配列を返す(例外にしない)。JSONのパース・スキーマ違反は例外として呼び出し元に伝播させ、
// 壊れたデータのままビルドが通ってしまう事故を防ぐ(article-detail/design.md#エラーハンドリング)
export function getAllArticles(dir: string = DEFAULT_ARTICLES_DIR): Article[] {
  if (!fs.existsSync(dir)) return []

  const filenames = fs.readdirSync(dir).filter((name) => name.endsWith('.json'))
  const articles = filenames.map((filename) => {
    const raw: unknown = JSON.parse(fs.readFileSync(path.join(dir, filename), 'utf8'))
    return parseArticle(raw, filename)
  })

  return articles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

// 指定した日付の記事を1件返す。該当ファイルが存在しない日付は「記事なし」を表す
// nullを返す(存在しない日付へのアクセスは通常のnot found扱いであり、例外にしない)
export function getArticleByDate(date: string, dir: string = DEFAULT_ARTICLES_DIR): Article | null {
  const filePath = path.join(dir, `${date}.json`)
  if (!fs.existsSync(filePath)) return null

  const raw: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return parseArticle(raw, `${date}.json`)
}
