// 記事一覧のページ分割ロジック(仕様: requirements.md#ビジネスルール・制約-2、
// design.md「記事一覧をページ分割する処理」)。getAllArticles()が新しい順を保証しているため、
// ここでは順序を変えず範囲を切り出すだけでよい

export type PaginationResult<T> = {
  items: T[]
  totalPages: number
}

export function paginate<T>(items: T[], page: number, pageSize = 20): PaginationResult<T> {
  const totalPages = Math.ceil(items.length / pageSize)
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    totalPages,
  }
}
