import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { getAllArticles, getArticleByDate } from '../../../app/news-digest/lib/articles'

const VALID_DIR = path.join(__dirname, '../fixtures/articles-valid')
const INVALID_DIR = path.join(__dirname, '../fixtures/articles-invalid')
const MISSING_DIR = path.join(__dirname, '../fixtures/articles-does-not-exist')

// 仕様: specs/news-digest/article-detail/requirements.md#記事本文表示-1、specs/news-digest/article-detail/requirements.md#記事本文表示-2
describe('記事データの読み込み - content/news-digest/articles/配下のJSONファイルを取得する', () => {
  it('getAllArticlesが全記事を日付の新しい順に返すこと', () => {
    const articles = getAllArticles(VALID_DIR)
    expect(articles.map((a) => a.date)).toEqual(['2026-09-09', '2026-09-02'])
  })

  it('getArticleByDateが指定した日付の記事を返すこと', () => {
    const article = getArticleByDate('2026-09-09', VALID_DIR)
    expect(article?.date).toBe('2026-09-09')
    expect(article?.topics).toHaveLength(2)
  })

  it('存在しない日付を指定した場合、getArticleByDateはnullを返すこと(異常系ではなく通常のnot found扱い)', () => {
    expect(getArticleByDate('2099-01-01', VALID_DIR)).toBeNull()
  })

  it('記事データディレクトリ自体が存在しない場合、getAllArticlesは空配列を返すこと(運用開始直後の状態)', () => {
    expect(getAllArticles(MISSING_DIR)).toEqual([])
  })

  it('不正なJSON(スキーマ違反)を含むディレクトリでは、getAllArticlesの例外が呼び出し元に伝播すること', () => {
    expect(() => getAllArticles(INVALID_DIR)).toThrow()
  })
})
