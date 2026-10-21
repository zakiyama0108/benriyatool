import { describe, it, expect } from 'vitest'
import { buildNotificationMessage } from '../../../app/lib/digestFailureNotification/buildNotificationMessage'

// 仕様: specs/digest-failure-notification/requirements.md#失敗検知・通知-4
describe('通知メッセージの組み立て - アプリ名・失敗したワークフロー名・失敗日時(JST)・ログURLを含む本文を組み立てる', () => {
  it('「AI駆動開発ダイジェスト 日次記事公開」の失敗情報から、アプリ名(ai-dev-digest)・ワークフロー名・JSTに変換した失敗日時・ログURLを含む本文が組み立てられること', () => {
    const message = buildNotificationMessage({
      workflowName: 'AI駆動開発ダイジェスト 日次記事公開',
      updatedAt: '2026-10-21T00:50:00Z', // UTC → JST 2026-10-21 09:50
      htmlUrl: 'https://github.com/zakiyama0108/benriyatool/actions/runs/123',
    })

    expect(message).toContain('ai-dev-digest')
    expect(message).toContain('AI駆動開発ダイジェスト 日次記事公開')
    expect(message).toContain('2026-10-21 09:50')
    expect(message).toContain('https://github.com/zakiyama0108/benriyatool/actions/runs/123')
  })

  it('「重要ニュース週刊ダイジェスト 週次記事公開」のワークフロー名から、アプリ名(news-digest)が導出されること', () => {
    const message = buildNotificationMessage({
      workflowName: '重要ニュース週刊ダイジェスト 週次記事公開',
      updatedAt: '2026-10-21T00:50:00Z',
      htmlUrl: 'https://github.com/zakiyama0108/benriyatool/actions/runs/124',
    })

    expect(message).toContain('news-digest')
  })

  it('「トレンドダイジェスト 週次記事公開」のワークフロー名から、アプリ名(trend-digest)が導出されること', () => {
    const message = buildNotificationMessage({
      workflowName: 'トレンドダイジェスト 週次記事公開',
      updatedAt: '2026-10-21T00:50:00Z',
      htmlUrl: 'https://github.com/zakiyama0108/benriyatool/actions/runs/125',
    })

    expect(message).toContain('trend-digest')
  })

  it('「研究発見 週次記事公開」のワークフロー名から、アプリ名(research-digest)が導出されること', () => {
    const message = buildNotificationMessage({
      workflowName: '研究発見 週次記事公開',
      updatedAt: '2026-10-21T00:50:00Z',
      htmlUrl: 'https://github.com/zakiyama0108/benriyatool/actions/runs/126',
    })

    expect(message).toContain('research-digest')
  })

  it('「週刊未来予測 週次記事公開」のワークフロー名から、アプリ名(future-digest)が導出されること', () => {
    const message = buildNotificationMessage({
      workflowName: '週刊未来予測 週次記事公開',
      updatedAt: '2026-10-21T00:50:00Z',
      htmlUrl: 'https://github.com/zakiyama0108/benriyatool/actions/runs/127',
    })

    expect(message).toContain('future-digest')
  })
})
