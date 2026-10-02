import { describe, it, expect } from 'vitest'
import genresData from '../../../content/research-digest/genres.json'
import { parseGenres, loadGenres, getActiveGenres, type GenreConfig } from '../../../app/research-digest/lib/genres'

// 仕様: specs/research-digest/content-selection/requirements.md#機能要件-1
describe('ジャンル設定ファイル - ジャンルをコードではなく設定ファイルで管理し、追記で増やせるようにする', () => {
  it('genres.jsonの記載順どおりにジャンルが返ること', () => {
    const genres = loadGenres()
    expect(genres.map((g) => g.id)).toEqual((genresData as GenreConfig[]).map((g) => g.id))
  })

  it('active: falseのジャンルは収集対象から外れるが、過去記事の表示用にラベルは引けること', () => {
    const genres = parseGenres([
      { id: 'medical-health', label: '医療・健康', description: '説明A', active: true },
      { id: 'retired-genre', label: '廃止済みジャンル', description: '説明B', active: false },
    ])
    expect(getActiveGenres(genres).map((g) => g.id)).toEqual(['medical-health'])
    expect(genres.find((g) => g.id === 'retired-genre')?.label).toBe('廃止済みジャンル')
  })
})

// 仕様: specs/research-digest/content-selection/requirements.md#ジャンル-1、specs/research-digest/content-selection/requirements.md#ジャンル-2、specs/research-digest/content-selection/requirements.md#ジャンル-3、specs/research-digest/content-selection/requirements.md#ジャンル-4、specs/research-digest/content-selection/requirements.md#ジャンル-5、specs/research-digest/content-selection/requirements.md#ジャンル-6、specs/research-digest/content-selection/requirements.md#ジャンル-7、specs/research-digest/content-selection/requirements.md#ジャンル-8、specs/research-digest/content-selection/requirements.md#ジャンル-9、specs/research-digest/content-selection/requirements.md#ジャンル-10
describe('対象ジャンル - 実データに、医療・健康から教育・子育てまでの10ジャンルが順に定義されている', () => {
  const genres = loadGenres()

  it('現在有効な10ジャンルが定義されていること', () => {
    expect(getActiveGenres(genres)).toHaveLength(10)
  })

  it('ジャンル名が仕様の記載順(医療・健康、栄養・食、心理・脳科学、睡眠・運動、環境・気候、AI・情報技術、経済・行動科学、宇宙・物理、材料・エネルギー、教育・子育て)で並ぶこと', () => {
    expect(genres.map((g) => g.label)).toEqual([
      '医療・健康',
      '栄養・食',
      '心理・脳科学',
      '睡眠・運動',
      '環境・気候',
      'AI・情報技術',
      '経済・行動科学',
      '宇宙・物理',
      '材料・エネルギー',
      '教育・子育て',
    ])
  })
})

describe('ジャンル設定の検証 - 壊れたジャンル設定をビルド時に検知するため、不正な設定は例外にする', () => {
  it('idが重複する場合に例外になること', () => {
    expect(() =>
      parseGenres([
        { id: 'medical-health', label: 'A', description: '説明', active: true },
        { id: 'medical-health', label: 'B', description: '説明', active: true },
      ]),
    ).toThrow()
  })

  it('labelが空の場合に例外になること', () => {
    expect(() => parseGenres([{ id: 'medical-health', label: '', description: '説明', active: true }])).toThrow()
  })

  it('activeが真偽値でない場合に例外になること', () => {
    expect(() => parseGenres([{ id: 'medical-health', label: 'A', description: '説明', active: 'true' }])).toThrow()
  })
})
