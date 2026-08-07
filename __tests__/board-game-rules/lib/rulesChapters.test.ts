import { describe, it, expect } from 'vitest'
import { RULE_CHAPTERS, CHAPTER_KEYS, chapterHeading } from '../../../app/board-game-rules/lib/rulesChapters'

// 仕様: specs/board-game-rules/game-registration/design.md#board_game_rules_games(変更)
describe('【詳しい版】ルール本文の共通章立て - 章キーと表示見出しの対応', () => {
  it('共通章立ては、概要・準備・手番の流れ・勝利条件・得点計算・特殊ルールの6章をこの順で持つこと(横断分析のためキーを固定)', () => {
    expect(CHAPTER_KEYS).toEqual(['overview', 'setup', 'turn_flow', 'victory', 'scoring', 'special'])
  })

  it('各章キーに対応する日本語の表示見出しが引けること(画面側の見出し表示に使う)', () => {
    expect(chapterHeading('overview')).toBe('概要')
    expect(chapterHeading('setup')).toBe('準備')
    expect(chapterHeading('turn_flow')).toBe('手番の流れ')
    expect(chapterHeading('victory')).toBe('勝利条件')
    expect(chapterHeading('scoring')).toBe('得点計算')
    expect(chapterHeading('special')).toBe('特殊ルール・例外')
  })

  it('共通章立てにないキーは見出しが引けない(undefined)こと(未知の章を表示側で無視できる)', () => {
    expect(chapterHeading('unknown_chapter')).toBeUndefined()
  })

  it('章キーの一覧と定義本体の章数が一致すること(キーと見出しの定義漏れを防ぐ)', () => {
    expect(CHAPTER_KEYS.length).toBe(RULE_CHAPTERS.length)
  })
})
