import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HubPage from '../app/page'

// 仕様: specs/hub-site/requirements.md#機能要件-2、specs/board-game-rules/game-list/requirements.md#メタ情報-11、specs/board-game-rules/game-list/design.md#トップページ掲載(hub-site)
describe('【トップページ】ツールカード一覧 - 本番公開済みの全アプリへのリンクを掲載する', () => {
  it('育休給付金シミュレーター(/ikukyu)・資産推移シミュレーター(/life-money-sim)・AI駆動開発ダイジェスト(/ai-dev-digest)・ボドゲのトリセツ(/board-game-rules)、すべてのカードが表示されること', () => {
    render(<HubPage />)

    const ikukyuLink = screen.getByRole('link', { name: /育休給付金シミュレーター/ })
    expect(ikukyuLink.getAttribute('href')).toBe('/ikukyu')

    const lifeMoneySimLink = screen.getByRole('link', { name: /資産推移シミュレーター/ })
    expect(lifeMoneySimLink.getAttribute('href')).toBe('/life-money-sim')

    const aiDevDigestLink = screen.getByRole('link', { name: /AI駆動開発ダイジェスト/ })
    expect(aiDevDigestLink.getAttribute('href')).toBe('/ai-dev-digest')

    const boardGameRulesLink = screen.getByRole('link', { name: /ボドゲのトリセツ/ })
    expect(boardGameRulesLink.getAttribute('href')).toBe('/board-game-rules')
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
