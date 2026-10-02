import { describe, it, expect } from 'vitest'
import { buildArticleUrl } from '../../../app/research-digest/lib/articleUrl'
import { buildBroadcastMessage } from '../../../app/research-digest/lib/buildBroadcastMessage'
import type { Article } from '../../../app/research-digest/lib/types'

// 仕様: specs/research-digest/line-broadcast/requirements.md#配信内容-5
describe('記事詳細ページURLの導出 - 配信本文に載せるURLと、記事ページ公開確認に使うURLを同じ関数から導出する', () => {
  it('記事データのidから記事詳細ページURLが導出されること', () => {
    const article: Article = { id: '2026-10-05', date: '2026-10-05', findings: [], emptyGenres: [] }
    expect(buildArticleUrl(article)).toBe('https://benriyatool.com/research-digest/2026-10-05')
  })

  it('配信本文の末尾のURLが、記事詳細ページURLと一致すること(通知に載るURLと疎通確認するURLが食い違わないようにするため)', () => {
    const article: Article = { id: '2026-10-12', date: '2026-10-12', findings: [], emptyGenres: [] }
    const lastLine = buildBroadcastMessage(article).split('\n').at(-1)
    expect(lastLine).toBe(buildArticleUrl(article))
  })
})
