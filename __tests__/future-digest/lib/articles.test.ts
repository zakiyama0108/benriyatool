import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { getAllArticles, getArticleById } from '../../../app/future-digest/lib/articles'

const VALID_DIR = path.join(__dirname, '../fixtures/articles-valid')
const INVALID_DIR = path.join(__dirname, '../fixtures/articles-invalid')
const MISSING_DIR = path.join(__dirname, '../fixtures/articles-does-not-exist')

// 仕様: specs/future-digest/article-detail/requirements.md#記事本文の表示-1、specs/future-digest/article-detail/requirements.md#記事本文の表示-2
describe('記事データの読み込み - content/future-digest/articles/配下のJSONファイルを取得する', () => {
  it('getArticleByIdが指定したIDの記事を返すこと', () => {
    const article = getArticleById('2026-09-24', VALID_DIR)
    expect(article?.id).toBe('2026-09-24')
    expect(article?.predictions).toHaveLength(20)
  })

  it('存在しないIDを指定した場合、getArticleByIdはnullを返すこと(異常系ではなく通常のnot found扱い)', () => {
    expect(getArticleById('2099-01-01', VALID_DIR)).toBeNull()
  })

  it('getAllArticlesが全記事を発行日の新しい順に返すこと', () => {
    const articles = getAllArticles(VALID_DIR)
    expect(articles.map((a) => a.id)).toEqual(['2026-09-24', '2026-09-17'])
  })

  it('記事データディレクトリ自体が存在しない場合、getAllArticlesは空配列を返すこと(運用開始直後の状態)', () => {
    expect(getAllArticles(MISSING_DIR)).toEqual([])
  })

  it('不正なJSON(スキーマ違反)を含むディレクトリでは、getAllArticlesの例外が呼び出し元に伝播すること', () => {
    expect(() => getAllArticles(INVALID_DIR)).toThrow()
  })
})
