import { describe, it, expect } from 'vitest'
import genresData from '../../../content/future-digest/genres.json'
import { parseGenres, loadGenres, getActiveGenres, type GenreConfig } from '../../../app/future-digest/lib/genres'

function makeRawGenres(overrides: Partial<GenreConfig>[] = []): unknown {
  const base: GenreConfig[] = [
    { id: 'technology-ai', label: 'テクノロジー・AI', description: '説明A', active: true, lineExcluded: false },
    { id: 'sexuality-romance', label: '性・恋愛', description: '説明B', active: true, lineExcluded: true },
  ]
  return overrides.length > 0 ? overrides : base
}

// 仕様: specs/future-digest/content-selection/requirements.md#機能要件-1
describe('ジャンル設定ファイル - ジャンル・個人的注目分野をコードではなく設定ファイルで管理する', () => {
  it('genres.jsonの記載順どおりにジャンルが返ること', () => {
    const genres = loadGenres()
    expect(genres.map((g) => g.id)).toEqual((genresData as GenreConfig[]).map((g) => g.id))
  })

  it('active: falseのジャンルは収集対象(getActiveGenres)から外れるが、ラベルは引けること', () => {
    const genres = parseGenres([
      { id: 'technology-ai', label: 'テクノロジー・AI', description: '説明A', active: true, lineExcluded: true },
      { id: 'retired-genre', label: '廃止済みジャンル', description: '説明B', active: false, lineExcluded: false },
    ])
    const active = getActiveGenres(genres)
    expect(active.map((g) => g.id)).toEqual(['technology-ai'])
    expect(genres.find((g) => g.id === 'retired-genre')?.label).toBe('廃止済みジャンル')
  })
})

// 仕様: specs/future-digest/content-selection/requirements.md#ジャンル-1、specs/future-digest/content-selection/requirements.md#ジャンル-2、specs/future-digest/content-selection/requirements.md#ジャンル-3、specs/future-digest/content-selection/requirements.md#ジャンル-4、specs/future-digest/content-selection/requirements.md#ジャンル-5、specs/future-digest/content-selection/requirements.md#ジャンル-6、specs/future-digest/content-selection/requirements.md#ジャンル-7、specs/future-digest/content-selection/requirements.md#ジャンル-8、specs/future-digest/content-selection/requirements.md#ジャンル-9、specs/future-digest/content-selection/requirements.md#ジャンル-10
describe('ジャンル設定ファイル - 実データが10ジャンル(性・恋愛、個人的注目分野を含む)の定義を満たすこと', () => {
  const genres = loadGenres()

  it('現在有効な10ジャンルが定義されていること', () => {
    expect(getActiveGenres(genres)).toHaveLength(10)
  })

  it('lineExcluded: trueのジャンルが1つ以上存在すること(line-broadcastの代表見出し選定がジャンルIDの直接比較に依存しないことを保証する)', () => {
    expect(genres.some((g) => g.lineExcluded === true)).toBe(true)
  })

  it('個人的注目分野がAR・VR、若返りのテーマを持つこと', () => {
    const personalInterest = genres.find((g) => g.id === 'personal-interest')
    expect(personalInterest?.themes).toEqual(['AR・VR', '若返り'])
  })
})

// 仕様: specs/future-digest/content-selection/design.md「データ設計(ジャンル・注目テーマの設定ファイル)」
describe('ジャンル設定の検証 - 不正なジャンル設定を検知して例外を投げる(ビルド時に壊れた設定を弾くため)', () => {
  it('idが重複する場合に例外になること', () => {
    expect(() =>
      parseGenres(
        makeRawGenres([
          { id: 'technology-ai', label: 'A', description: '説明', active: true, lineExcluded: true },
          { id: 'technology-ai', label: 'B', description: '説明', active: true, lineExcluded: false },
        ]),
      ),
    ).toThrow()
  })

  it('labelが空の場合に例外になること', () => {
    expect(() =>
      parseGenres(makeRawGenres([{ id: 'technology-ai', label: '', description: '説明', active: true, lineExcluded: true }])),
    ).toThrow()
  })

  it('themesが文字列配列でない場合に例外になること', () => {
    expect(() =>
      parseGenres(
        makeRawGenres([
          {
            id: 'personal-interest',
            label: '個人的注目分野',
            description: '説明',
            themes: [1, 2] as unknown as string[],
            active: true,
            lineExcluded: true,
          },
        ]),
      ),
    ).toThrow()
  })

  it('lineExcludedが真偽値でない場合に例外になること', () => {
    expect(() =>
      parseGenres(
        makeRawGenres([
          { id: 'technology-ai', label: 'A', description: '説明', active: true, lineExcluded: 'true' as unknown as boolean },
        ]),
      ),
    ).toThrow()
  })

  it('lineExcluded: trueのジャンルが1件もない場合に例外になること', () => {
    expect(() =>
      parseGenres([{ id: 'technology-ai', label: 'A', description: '説明', active: true, lineExcluded: false }]),
    ).toThrow()
  })
})
