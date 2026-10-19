import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HubPage from '../app/page'

// 仕様: specs/hub-site/requirements.md#機能要件-2、specs/board-game-rules/game-list/requirements.md#メタ情報-11、specs/board-game-rules/game-list/design.md#トップページ掲載(hub-site)
describe('【トップページ】ツールカード一覧 - 本番公開済みの全アプリへのリンクを掲載する', () => {
  it('育休給付金シミュレーター(/ikukyu)・資産推移シミュレーター(/life-money-sim)・ボドゲのトリセツ(/board-game-rules)・曲名からプレイリスト作成(/spotify-playlist)、すべてのカードが表示されること', () => {
    render(<HubPage />)

    const ikukyuLink = screen.getByRole('link', { name: /育休給付金シミュレーター/ })
    expect(ikukyuLink.getAttribute('href')).toBe('/ikukyu')

    const lifeMoneySimLink = screen.getByRole('link', { name: /資産推移シミュレーター/ })
    expect(lifeMoneySimLink.getAttribute('href')).toBe('/life-money-sim')

    const boardGameRulesLink = screen.getByRole('link', { name: /ボドゲのトリセツ/ })
    expect(boardGameRulesLink.getAttribute('href')).toBe('/board-game-rules')

    const spotifyPlaylistLink = screen.getByRole('link', { name: /曲名からプレイリスト作成/ })
    expect(spotifyPlaylistLink.getAttribute('href')).toBe('/spotify-playlist')
  })
})

// 仕様: specs/hub-site/requirements.md#機能要件-2、specs/blog/digest-hub/requirements.md#サマリ
describe('【トップページ】ダイジェストハブへの導線 - 5アプリ個別カードは廃止し、/blogへの1枚のカードに集約する', () => {
  it('ai-dev-digest/news-digest/trend-digest/future-digest/research-digestへの個別リンクが存在しないこと', () => {
    render(<HubPage />)

    expect(screen.queryByRole('link', { name: /AI駆動開発ダイジェスト/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /重要ニュースダイジェスト/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /週刊トレンド/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /週刊未来予測/ })).toBeNull()
    expect(screen.queryByRole('link', { name: /週刊研究発見/ })).toBeNull()
  })

  it('/blogへのリンクが1つ表示されること', () => {
    render(<HubPage />)

    const blogLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('href') === '/blog')
    expect(blogLinks).toHaveLength(1)
  })
})

// 仕様: specs/hub-site/requirements.md#機能要件-3
describe('【トップページ】ガイド記事一覧への導線 - ツールカードとは区別して表示する', () => {
  it('育休給付金ガイド記事一覧(/ikukyu/guide)へのリンクが表示されること', () => {
    render(<HubPage />)

    const guideLink = screen.getByRole('link', { name: /育休給付金ガイド記事/ })
    expect(guideLink.getAttribute('href')).toBe('/ikukyu/guide')
  })
})
