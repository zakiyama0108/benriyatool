import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DigestAppCard from '../../../app/blog/components/DigestAppCard'

// 仕様: specs/blog/digest-hub/requirements.md#ダイジェストカード一覧-2、specs/blog/digest-hub/design.md#決定事項-カードコンポーネントの共通化
describe('DigestAppCard - 1アプリ分のカード(アイコン・名称・概要・配信曜日)を描画し、カード全体をリンクにする', () => {
  it('propsで渡した名称・概要・配信曜日ラベルが表示されること', () => {
    render(
      <DigestAppCard
        name="AI駆動開発ダイジェスト"
        description="AI駆動開発関連の話題をまとめてお届け"
        scheduleLabel="毎日"
        icon="🤖"
        href="/ai-dev-digest"
      />
    )

    expect(screen.getByText('AI駆動開発ダイジェスト')).toBeTruthy()
    expect(screen.getByText('AI駆動開発関連の話題をまとめてお届け')).toBeTruthy()
    expect(screen.getByText(/毎日/)).toBeTruthy()
  })

  it('カード全体がhrefへのリンク(Link)になっていること', () => {
    render(
      <DigestAppCard
        name="週刊トレンド"
        description="様々なジャンルの流行を週2回自動収集"
        scheduleLabel="火・金(週2回)"
        icon="📈"
        href="/trend-digest"
      />
    )

    const link = screen.getByRole('link', { name: /週刊トレンド/ })
    expect(link.getAttribute('href')).toBe('/trend-digest')
  })
})
