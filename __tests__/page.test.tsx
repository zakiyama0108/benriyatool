import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HubPage from '../app/page'

// 仕様: specs/hub-site/requirements.md#機能要件-2
describe('【トップページ】ツールカード一覧 - 本番公開済みの全アプリへのリンクを掲載する', () => {
  it('育休給付金シミュレーター(/ikukyu)・資産推移シミュレーター(/life-money-sim)・AI駆動開発ダイジェスト(/ai-dev-digest)、すべてのカードが表示されること', () => {
    render(<HubPage />)

    const ikukyuLink = screen.getByRole('link', { name: /育休給付金シミュレーター/ })
    expect(ikukyuLink.getAttribute('href')).toBe('/ikukyu')

    const lifeMoneySimLink = screen.getByRole('link', { name: /資産推移シミュレーター/ })
    expect(lifeMoneySimLink.getAttribute('href')).toBe('/life-money-sim')

    const aiDevDigestLink = screen.getByRole('link', { name: /AI駆動開発ダイジェスト/ })
    expect(aiDevDigestLink.getAttribute('href')).toBe('/ai-dev-digest')
  })
})
