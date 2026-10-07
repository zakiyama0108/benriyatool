import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SourceTable from '../../../../../app/trend-digest/admin/sources/components/SourceTable'
import type { SourceDirectoryRow } from '../../../../../app/trend-digest/lib/buildSourceDirectory'

function makeRow(overrides: Partial<SourceDirectoryRow> = {}): SourceDirectoryRow {
  return {
    genreLabel: '音楽',
    editionLabel: 'エンタメ編',
    methodLabel: '固定リスト',
    criteriaText: '新規ランクイン、または順位が10位以上上昇',
    sources: [
      { name: 'Billboard JAPAN Hot 100', url: 'https://www.billboard-japan.com/charts/detail?a=hot100', regionLabel: '日本' },
    ],
    searchHints: [],
    ...overrides,
  }
}

// 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-1、specs/trend-digest/source-directory/requirements.md#機能要件-2、specs/trend-digest/source-directory/requirements.md#機能要件-3、specs/trend-digest/source-directory/requirements.md#機能要件-6、specs/trend-digest/source-directory/design.md「画面設計」
describe('情報源一覧の表の描画 - 行データを渡すと、ジャンルごとの情報源・採用基準を1枚の表として描画する', () => {
  it('5つの列見出し(ジャンル/編/選定方式/採用基準/情報源)が表示されること', () => {
    render(<SourceTable rows={[makeRow()]} />)
    for (const header of ['ジャンル', '編', '選定方式', '採用基準', '情報源']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeTruthy()
    }
  })

  it('渡した行数分の行が描画されること', () => {
    const rows = [makeRow({ genreLabel: '音楽' }), makeRow({ genreLabel: '日本映画' })]
    render(<SourceTable rows={rows} />)
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1) // +1は見出し行
  })

  it('固定リストジャンルの情報源の名前が元URLへのリンク(新規タブ・rel=noopener)になり、地域区分が日本語で表示されること', () => {
    render(<SourceTable rows={[makeRow()]} />)
    const link = screen.getByRole('link', { name: 'Billboard JAPAN Hot 100' })
    expect(link.getAttribute('href')).toBe('https://www.billboard-japan.com/charts/detail?a=hot100')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(screen.getByText(/日本/)).toBeTruthy()
  })

  it('複数の情報源を持つジャンルは、情報源がすべて表示されること', () => {
    const row = makeRow({
      genreLabel: '日本映画',
      sources: [
        { name: '興行通信社CINEMAランキング通信(国内)', url: 'https://www.kogyotsushin.com/archives/weekend/', regionLabel: '日本' },
        { name: '映画.com国内ランキング', url: 'https://eiga.com/ranking/jp/', regionLabel: '日本' },
        { name: 'Filmarks上映中ランキング', url: 'https://filmarks.com/list/now', regionLabel: '日本' },
      ],
    })
    render(<SourceTable rows={[row]} />)
    expect(screen.getByRole('link', { name: '興行通信社CINEMAランキング通信(国内)' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '映画.com国内ランキング' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Filmarks上映中ランキング' })).toBeTruthy()
  })

  it('WebSearchジャンルの行に検索の手がかりが表示されること', () => {
    const row = makeRow({
      genreLabel: 'SNSバズり',
      editionLabel: 'カルチャー・ライフスタイル編',
      methodLabel: 'WebSearch',
      criteriaText: '独立した言及元が3件以上',
      sources: [],
      searchHints: ['Xで話題 バズり 複数メディア', 'TikTok 投稿 話題 反響'],
    })
    render(<SourceTable rows={[row]} />)
    expect(screen.getByText(/Xで話題 バズり 複数メディア/)).toBeTruthy()
    expect(screen.getByText(/TikTok 投稿 話題 反響/)).toBeTruthy()
  })

  // 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-6
  it('併用ジャンルの行で、情報源の一覧と検索の手がかりの両方が表示されること', () => {
    const row = makeRow({
      genreLabel: 'アニメ',
      methodLabel: '固定リスト+WebSearch',
      criteriaText: '新規ランクイン、または順位上昇、またはWebSearchで独立した言及元が3件以上',
      sources: [
        { name: 'Filmarksアニメ 話題のおすすめアニメ', url: 'https://filmarks.com/list-anime/trend', regionLabel: '日本' },
        { name: 'AniLab 日本ウィークリーアニメランキング', url: 'https://anilabb.com/rate/anime?region=japan', regionLabel: '日本' },
      ],
      searchHints: ['SNS 話題 アニメ 反響'],
    })
    render(<SourceTable rows={[row]} />)
    expect(screen.getByRole('link', { name: 'Filmarksアニメ 話題のおすすめアニメ' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'AniLab 日本ウィークリーアニメランキング' })).toBeTruthy()
    expect(screen.getByText(/SNS 話題 アニメ 反響/)).toBeTruthy()
  })

  // 仕様: specs/trend-digest/source-directory/design.md「セキュリティ」
  it('http/https以外のスキームのURLはリンクにならず、名前のみがテキストとして表示されること', () => {
    const row = makeRow({
      sources: [{ name: '不正なリンクの情報源', url: 'javascript:alert(1)', regionLabel: '日本' }],
    })
    render(<SourceTable rows={[row]} />)
    expect(screen.queryByRole('link', { name: '不正なリンクの情報源' })).toBeNull()
    expect(screen.getByText('不正なリンクの情報源')).toBeTruthy()
  })
})

// 仕様: specs/trend-digest/source-directory/requirements.md#表示する内容の範囲-5
describe('情報源一覧の表は表示専用 - 入力欄・保存ボタン・削除ボタンを一切持たない', () => {
  it('表に入力欄(input/textarea)が存在しないこと', () => {
    render(<SourceTable rows={[makeRow()]} />)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('表に保存・削除・編集のボタンが存在しないこと', () => {
    render(<SourceTable rows={[makeRow()]} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })
})
