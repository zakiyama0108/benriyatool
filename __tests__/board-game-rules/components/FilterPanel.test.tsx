import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FilterPanel from '../../../app/board-game-rules/components/FilterPanel'
import { EMPTY_FILTERS, PLAYTIME_BAND_OPTIONS, type FilterOptions } from '../../../app/board-game-rules/lib/filterGames'

const OPTIONS: FilterOptions = {
  genres: ['戦略', '協力'],
  difficulties: ['普通', '難しい'],
  publishers: ['GP', 'HABA'],
  minAges: [8, 10],
  playerCounts: [1, 2, 3, 4],
  playtimeBands: PLAYTIME_BAND_OPTIONS,
}

// モバイルでは8分類+リセットがアイコンボタンの開閉配下にあるため(design.md「画面構成」)、
// これらを操作するテストは先にパネルを開いてから操作する(実際の利用手順と揃える)
function openFilterOptions() {
  fireEvent.click(screen.getByRole('button', { name: '絞り込み条件を開閉する' }))
}

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-9
describe('【絞り込みパネル】各分類の操作 - 送信ボタンを介さず、変更内容を即座に親へ通知する', () => {
  it('対応人数を選ぶと、送信操作なしにonChangeへ選択値が渡ること', () => {
    const onChange = vi.fn()
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={onChange} />)
    openFilterOptions()

    fireEvent.change(screen.getByLabelText('対応人数'), { target: { value: '3' } })

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, playerCount: 3 })
  })

  it('プレイ時間の時間帯を選ぶと、対応するPlaytimeBandがonChangeへ渡ること', () => {
    const onChange = vi.fn()
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={onChange} />)
    openFilterOptions()

    fireEvent.change(screen.getByLabelText('プレイ時間'), { target: { value: '60〜90分' } })

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, playtimeBand: PLAYTIME_BAND_OPTIONS[2] })
  })

  it('ジャンルを選ぶと、onChangeへ選択したジャンルが渡ること', () => {
    const onChange = vi.fn()
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={onChange} />)
    openFilterOptions()

    fireEvent.change(screen.getByLabelText('ジャンル'), { target: { value: '戦略' } })

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, genre: '戦略' })
  })

  it('対象年齢を選ぶと、onChangeへ選択した年齢(数値)が渡ること', () => {
    const onChange = vi.fn()
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={onChange} />)
    openFilterOptions()

    fireEvent.change(screen.getByLabelText('対象年齢'), { target: { value: '8' } })

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, minAge: 8 })
  })

  it('難易度を選ぶと、onChangeへ選択した難易度が渡ること', () => {
    const onChange = vi.fn()
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={onChange} />)
    openFilterOptions()

    fireEvent.change(screen.getByLabelText('難易度'), { target: { value: '普通' } })

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, difficulty: '普通' })
  })

  it('メーカー/出版社を選ぶと、onChangeへ選択したメーカーが渡ること', () => {
    const onChange = vi.fn()
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={onChange} />)
    openFilterOptions()

    fireEvent.change(screen.getByLabelText('メーカー/出版社'), { target: { value: 'GP' } })

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, publisher: 'GP' })
  })

  it('言語依存度を選ぶと、onChangeへtrue/falseが渡ること', () => {
    const onChange = vi.fn()
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={onChange} />)
    openFilterOptions()

    fireEvent.change(screen.getByLabelText('言語依存度(日本語ルール)'), { target: { value: 'true' } })

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, hasJapaneseRules: true })
  })

  it('受賞歴の「該当のみ」を選ぶと、onChangeへawardsOnly=trueが渡ること', () => {
    const onChange = vi.fn()
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={onChange} />)
    openFilterOptions()

    fireEvent.change(screen.getByLabelText('受賞歴'), { target: { value: 'only' } })

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, awardsOnly: true })
  })

  it('作者テキスト検索に入力すると、入力のたびonChangeへ現在の文字列が渡ること(パネルの開閉状態によらず常時操作できる)', () => {
    const onChange = vi.fn()
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('作者で検索'), { target: { value: 'トイバー' } })

    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, authorQuery: 'トイバー' })
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-8
describe('【絞り込みパネル】リセット操作 - すべての絞り込み条件を解除する', () => {
  it('何らかの条件が指定された状態でリセットを押すと、onChangeへEMPTY_FILTERSが渡ること', () => {
    const onChange = vi.fn()
    const filters = { ...EMPTY_FILTERS, playerCount: 3, genre: '戦略' as const, authorQuery: 'トイバー' }
    render(<FilterPanel options={OPTIONS} filters={filters} onChange={onChange} />)
    openFilterOptions()

    fireEvent.click(screen.getByRole('button', { name: 'リセット' }))

    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS)
  })
})

// 仕様: specs/board-game-rules/game-list/design.md#画面構成
describe('【絞り込みパネル】モバイル表示 - 作者テキスト検索欄は常時表示、残り8分類はアイコンボタンで開閉する初期閉状態', () => {
  it('初期状態では、作者テキスト検索欄は表示され、対応人数などのドロップダウンとリセットは表示されないこと', () => {
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={vi.fn()} />)

    expect(screen.getByLabelText('作者で検索')).toBeTruthy()
    // hidden属性を尊重するのはrole基準のクエリのため(getByLabelTextはhiddenを無視する)、
    // 表示・非表示の検証にはgetByRole/queryByRoleを使う
    expect(screen.queryByRole('combobox', { name: '対応人数' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'リセット' })).toBeNull()
  })

  it('開閉アイコンボタンを押すと、8分類のドロップダウンとリセットが表示され(aria-expanded=true)、もう一度押すと隠れること(aria-expanded=false)', () => {
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={vi.fn()} />)
    const toggle = screen.getByRole('button', { name: '絞り込み条件を開閉する' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('combobox', { name: '対応人数' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'リセット' })).toBeTruthy()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('combobox', { name: '対応人数' })).toBeNull()
  })

  it('開閉中も作者テキスト検索欄は隠れず操作できること', () => {
    const onChange = vi.fn()
    render(<FilterPanel options={OPTIONS} filters={EMPTY_FILTERS} onChange={onChange} />)
    openFilterOptions()

    fireEvent.change(screen.getByLabelText('作者で検索'), { target: { value: '宮本' } })
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTERS, authorQuery: '宮本' })
  })
})
