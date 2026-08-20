import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import GameInfo from '../../../app/board-game-rules/components/GameInfo'
import type { Game } from '../../../app/board-game-rules/lib/games'

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'game-1',
    name: 'カタン',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: [],
    minAge: null,
    difficulty: null,
    publisher: null,
    author: null,
    hasJapaneseRules: null,
    awards: null,
    releaseYear: null,
    rulesSimple: '',
    rulesDetailed: [],
    introPhotoPaths: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

// 仕様: specs/board-game-rules/game-detail/requirements.md#基本情報の表示-1
describe('分類情報の表示 - 必須項目(ゲーム名・対応人数・プレイ時間)は常に表示する', () => {
  it('任意項目がすべて未登録でも、ゲーム名・対応人数・プレイ時間は表示されること', () => {
    render(<GameInfo game={makeGame()} />)

    expect(screen.getByText('カタン')).toBeTruthy()
    expect(screen.getByText(/3.*4.*人/)).toBeTruthy()
    expect(screen.getByText(/60.*90.*分/)).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/game-detail/design.md#分類情報を表示する処理-2
describe('分類情報の表示 - 空欄(未登録)の任意項目は、その項目自体を出さない(「未登録」ラベルも出さない)', () => {
  it('対象年齢・難易度・出版社などが未登録のとき、それらの項目も「未登録」の文字も表示されないこと', () => {
    render(<GameInfo game={makeGame()} />)

    expect(screen.queryByText(/未登録/)).toBeNull()
    expect(screen.queryByText(/対象年齢/)).toBeNull()
    expect(screen.queryByText(/難易度/)).toBeNull()
  })

  it('登録済みの任意項目(ジャンル・対象年齢)は、値とともに表示されること', () => {
    render(<GameInfo game={makeGame({ genres: ['戦略', '交渉'], minAge: 10 })} />)

    expect(screen.getByText(/戦略/)).toBeTruthy()
    expect(screen.getByText(/10/)).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/game-detail/design.md#分類情報を表示する処理-3
describe('分類情報の表示 - 発売年は西暦に「年」を付けて表示する', () => {
  it('発売年が2018のとき「2018年」と表示されること', () => {
    render(<GameInfo game={makeGame({ releaseYear: 2018 })} />)

    expect(screen.getByText(/2018年/)).toBeTruthy()
  })
})
