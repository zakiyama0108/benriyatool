import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { getAllArticles, getArticleById } from '../../../app/research-digest/lib/articles'

const VALID_DIR = path.join(__dirname, '../fixtures/articles-valid')
const INVALID_DIR = path.join(__dirname, '../fixtures/articles-invalid')
const MISSING_DIR = path.join(__dirname, '../fixtures/articles-does-not-exist')

// 仕様: specs/research-digest/article-detail/requirements.md#記事本文の表示-1、specs/research-digest/article-detail/requirements.md#記事本文の表示-2
describe('過去記事の検証付き読み込み - 配信済みの判定に使うため、記事データを検証しながら発行日の新しい順に取得する', () => {
  it('指定したIDの記事が返ること', () => {
    const article = getArticleById('2026-10-05-body-life', VALID_DIR)
    expect(article?.id).toBe('2026-10-05-body-life')
    expect(article?.findings).toHaveLength(4)
    expect(article?.emptyGenres).toHaveLength(1)
  })

  it('存在しないIDは記事なし(null)になること', () => {
    expect(getArticleById('2099-01-01-body-life', VALID_DIR)).toBeNull()
  })

  it('全記事が発行日の新しい順に返ること', () => {
    expect(getAllArticles(VALID_DIR).map((a) => a.id)).toEqual(['2026-10-12-body-life', '2026-10-05-body-life'])
  })

  it('記事データのディレクトリ自体がない運用開始直後は、空の一覧が返ること', () => {
    expect(getAllArticles(MISSING_DIR)).toEqual([])
  })

  it('検証に通らない記事データがあると、壊れたまま配信済みの判定が進まないよう例外になること', () => {
    expect(() => getAllArticles(INVALID_DIR)).toThrow()
  })
})
