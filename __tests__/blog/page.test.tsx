import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BlogHubPage, { metadata } from '../../app/blog/page'
import { DIGEST_APPS } from '../../app/blog/lib/digestApps'

// 仕様: specs/blog/digest-hub/requirements.md#ダイジェストカード一覧-1、specs/blog/digest-hub/requirements.md#ダイジェストカード一覧-4
describe('/blogページ - 5アプリのカードをDIGEST_APPSの記載順で一覧表示する', () => {
  it('5枚のカードがDIGEST_APPSの記載順(ai-dev-digest→news-digest→trend-digest→future-digest→research-digest)で表示されること', () => {
    render(<BlogHubPage />)

    const links = DIGEST_APPS.map((app) => screen.getByRole('link', { name: new RegExp(app.name) }))
    expect(links).toHaveLength(5)
    expect(links.map((link) => link.getAttribute('href'))).toEqual(DIGEST_APPS.map((app) => app.href))
  })
})

// 仕様: specs/blog/digest-hub/requirements.md#情報源一覧への導線-1
describe('/blogページ - 情報源一覧ページへの導線は1つだけ置く', () => {
  it('/blog/admin/sourcesへのテキストリンクが1つだけ存在すること', () => {
    render(<BlogHubPage />)

    const sourceLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/blog/admin/sources')
    expect(sourceLinks).toHaveLength(1)
  })
})

// 仕様: specs/blog/digest-hub/requirements.md#メタ情報-1
describe('/blogページのメタ情報 - title/descriptionを指定の文言で設定する', () => {
  it('titleが「週刊ダイジェスト一覧｜べんりやつーる」、descriptionが指定の文言であること', () => {
    expect(metadata.title).toBe('週刊ダイジェスト一覧｜べんりやつーる')
    expect(metadata.description).toBe(
      'AI駆動開発・ニュース・トレンド・未来予測・研究発見の5つのダイジェストアプリへの入口を、配信曜日付きでまとめています。'
    )
  })
})
