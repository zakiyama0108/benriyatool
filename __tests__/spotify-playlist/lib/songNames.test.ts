import { describe, it, expect } from 'vitest'
import { parseSongInput, hasSearchableSong, MAX_SONG_NAMES } from '@/app/spotify-playlist/lib/songNames'

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#曲名の入力-1、specs/spotify-playlist/playlist-create/requirements.md#曲名の入力-3
describe('曲名入力欄のテキストを検索対象の曲名一覧にする - 1行1曲・空行は無視・重複はそのまま', () => {
  it('改行区切りで曲名を取り出し、前後の空白を除くこと', () => {
    const { names } = parseSongInput('  Lemon  \nPretender\n  夜に駆ける')
    expect(names).toEqual(['Lemon', 'Pretender', '夜に駆ける'])
  })

  it('空行・空白のみの行は検索対象から除くこと', () => {
    const { names } = parseSongInput('Lemon\n\n   \n\t\nPretender\n')
    expect(names).toEqual(['Lemon', 'Pretender'])
  })

  it('同じ曲名が複数行あっても重複除去はせず、行数分そのまま残すこと', () => {
    const { names } = parseSongInput('Lemon\nLemon\nLemon')
    expect(names).toEqual(['Lemon', 'Lemon', 'Lemon'])
  })

  it('検索対象の曲名が1件も無いときだけ「検索する」を無効化できるよう、有無を判定できること', () => {
    expect(hasSearchableSong('\n  \n')).toBe(false)
    expect(hasSearchableSong('')).toBe(false)
    expect(hasSearchableSong('\nLemon\n')).toBe(true)
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#曲名の入力-2
describe('曲名の件数上限 - 100件を超えた分は検索対象に含めない', () => {
  it('101件目以降は検索対象一覧から外し、その件数(ignoredCount)を返すこと', () => {
    const input = Array.from({ length: 130 }, (_, i) => `曲${i + 1}`).join('\n')
    const { names, ignoredCount } = parseSongInput(input)
    expect(names).toHaveLength(MAX_SONG_NAMES)
    expect(names[MAX_SONG_NAMES - 1]).toBe('曲100')
    expect(ignoredCount).toBe(30)
  })

  it('100件ちょうどなら全件が対象で、超過は0件になること', () => {
    const input = Array.from({ length: 100 }, (_, i) => `曲${i + 1}`).join('\n')
    const { names, ignoredCount } = parseSongInput(input)
    expect(names).toHaveLength(100)
    expect(ignoredCount).toBe(0)
  })
})
