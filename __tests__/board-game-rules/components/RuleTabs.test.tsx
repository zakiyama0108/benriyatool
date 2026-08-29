import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RuleTabs from '../../../app/board-game-rules/components/RuleTabs'
import type { RuleChapter } from '../../../app/board-game-rules/lib/games'

const detailed: RuleChapter[] = [
  { key: 'overview', body: '2〜4人で遊ぶ開拓ゲームです' },
  { key: 'setup', body: '' }, // 空章(準備) → 表示しない
  { key: 'victory', body: '10点で勝利' },
  { key: 'unknown_key', body: '未知の章キーの本文' }, // 共通章立てにないキー → 表示しない
]

// 仕様: specs/board-game-rules/game-detail/requirements.md#ルール本文の表示-4
describe('ルールタブ - 初期表示は簡単版を選択状態にする', () => {
  it('初期状態では簡単版の要約テキストが表示されること', () => {
    render(<RuleTabs rulesSimple="かんたんに言うと開拓ゲーム" rulesDetailed={detailed} />)

    expect(screen.getByText('かんたんに言うと開拓ゲーム')).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#ルール本文の表示-2、specs/board-game-rules/game-detail/requirements.md#ルール本文の表示-3
describe('ルールタブ - 詳しい版は共通章立ての見出し付きで、本文のある章だけ表示する', () => {
  it('「詳しい版」に切り替えると、章の見出し(日本語)と本文が表示されること', () => {
    render(<RuleTabs rulesSimple="要約" rulesDetailed={detailed} />)
    fireEvent.click(screen.getByRole('button', { name: '詳しい版' }))

    expect(screen.getByText('概要')).toBeTruthy()
    expect(screen.getByText('2〜4人で遊ぶ開拓ゲームです')).toBeTruthy()
    expect(screen.getByText('勝利条件')).toBeTruthy()
    expect(screen.getByText('10点で勝利')).toBeTruthy()
  })

  it('本文が空の章(準備)は、見出しごと表示されないこと', () => {
    render(<RuleTabs rulesSimple="要約" rulesDetailed={detailed} />)
    fireEvent.click(screen.getByRole('button', { name: '詳しい版' }))

    expect(screen.queryByText('準備')).toBeNull()
  })

  it('共通章立てに定義のない未知の章キーは表示しないこと(壊れた構造への頑健性)', () => {
    render(<RuleTabs rulesSimple="要約" rulesDetailed={detailed} />)
    fireEvent.click(screen.getByRole('button', { name: '詳しい版' }))

    expect(screen.queryByText('未知の章キーの本文')).toBeNull()
  })
})
