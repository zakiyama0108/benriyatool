import { describe, it, expect } from 'vitest'
import { buildArticleUrl } from '../../../app/future-digest/lib/articleUrl'
import { buildBroadcastMessage } from '../../../app/future-digest/lib/buildBroadcastMessage'
import type { Article } from '../../../app/future-digest/lib/types'

// 仕様: specs/future-digest/line-broadcast/requirements.md#配信内容-6
describe('記事詳細ページURLの導出 - 配信本文に載せるURLと、記事ページ公開確認に使うURLを同じ関数から導出する', () => {
  it('記事データのidから記事詳細ページURLが導出されること', () => {
    const article: Article = {
      id: '2026-10-01-science-tech',
      edition: 'science-tech',
      date: '2026-10-01',
      issueNumber: 1,
      predictions: [],
      emptySlots: [],
    }
    expect(buildArticleUrl(article)).toBe('https://benriyatool.com/future-digest/2026-10-01-science-tech')
  })

  it('buildBroadcastMessageの本文末尾のURLが、buildArticleUrlの戻り値と一致すること(通知に載るURLと疎通確認するURLが食い違わないようにするため)', () => {
    const article: Article = {
      id: '2026-10-08-life-society',
      edition: 'life-society',
      date: '2026-10-08',
      issueNumber: 2,
      predictions: [],
      emptySlots: [],
    }
    const message = buildBroadcastMessage(article)
    const lastLine = message.split('\n').at(-1)
    expect(lastLine).toBe(buildArticleUrl(article))
  })
})
