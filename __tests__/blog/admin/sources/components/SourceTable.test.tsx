import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SourceTable from '../../../../../app/blog/admin/sources/components/SourceTable'
import type { SourceDirectoryRow } from '../../../../../app/blog/lib/sourceDirectory/types'

function makeRow(overrides: Partial<SourceDirectoryRow> = {}): SourceDirectoryRow {
  return {
    genreLabel: '音楽',
    methodLabel: '固定リスト',
    criteriaText: '新規ランクイン、または順位が10位以上上昇',
    sources: [{ name: 'Billboard JAPAN Hot 100', url: 'https://www.billboard-japan.com/charts/detail?a=hot100', regionLabel: '日本' }],
    searchHints: [],
    ...overrides,
  }
}

// 仕様: specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-1、specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-2、specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-3、specs/blog/source-directory/design.md#決定事項-編(edition)列の表示判定
describe('SourceTableの表の描画 - 行データを渡すと、ジャンルごとの情報源・採用基準を1枚の表として描画する', () => {
  it('編の区別を持つ行(editionLabel)が1件もない場合、編列自体が表示されないこと', () => {
    render(<SourceTable rows={[makeRow(), makeRow({ genreLabel: '日本映画' })]} />)
    expect(screen.queryByRole('columnheader', { name: '編' })).toBeNull()
  })

  it('編の区別を持つ行が1件でもある場合、編列が表示されること', () => {
    render(<SourceTable rows={[makeRow({ editionLabel: 'エンタメ編' })]} />)
    expect(screen.getByRole('columnheader', { name: '編' })).toBeTruthy()
  })

  it('ジャンル/選定方式/採用基準/情報源の4つの列見出しは常に表示されること', () => {
    render(<SourceTable rows={[makeRow()]} />)
    for (const header of ['ジャンル', '選定方式', '採用基準', '情報源']) {
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

  it('地域区分(regionLabel)を持たない情報源は、地域区分を表示しないこと', () => {
    render(<SourceTable rows={[makeRow({ sources: [{ name: 'Anthropic', url: 'https://www.anthropic.com/rss.xml' }] })]} />)
    const link = screen.getByRole('link', { name: 'Anthropic' })
    expect(link).toBeTruthy()
    expect(screen.queryByText(/日本|海外/)).toBeNull()
  })

  it('複数の情報源を持つジャンルは、情報源がすべて表示されること', () => {
    const row = makeRow({
      genreLabel: '日本映画',
      sources: [
        { name: '興行通信社CINEMAランキング通信(国内)', url: 'https://www.kogyotsushin.com/archives/weekend/', regionLabel: '日本' },
        { name: '映画.com国内ランキング', url: 'https://eiga.com/ranking/jp/', regionLabel: '日本' },
      ],
    })
    render(<SourceTable rows={[row]} />)
    expect(screen.getByRole('link', { name: '興行通信社CINEMAランキング通信(国内)' })).toBeTruthy()
    expect(screen.getByRole('link', { name: '映画.com国内ランキング' })).toBeTruthy()
  })

  it('WebSearchジャンルの行に検索の手がかりが表示されること', () => {
    const row = makeRow({
      genreLabel: 'SNSバズり',
      methodLabel: 'WebSearch',
      criteriaText: '独立した言及元が3件以上',
      sources: [],
      searchHints: ['Xで話題 バズり 複数メディア', 'TikTok 投稿 話題 反響'],
    })
    render(<SourceTable rows={[row]} />)
    expect(screen.getByText(/Xで話題 バズり 複数メディア/)).toBeTruthy()
    expect(screen.getByText(/TikTok 投稿 話題 反響/)).toBeTruthy()
  })

  it('http/https以外のスキームのURLはリンクにならず、名前のみがテキストとして表示されること', () => {
    const row = makeRow({
      sources: [{ name: '不正なリンクの情報源', url: 'javascript:alert(1)', regionLabel: '日本' }],
    })
    render(<SourceTable rows={[row]} />)
    expect(screen.queryByRole('link', { name: '不正なリンクの情報源' })).toBeNull()
    expect(screen.getByText('不正なリンクの情報源')).toBeTruthy()
  })
})

// 仕様: specs/blog/source-directory/requirements.md#表示する内容の範囲-1、specs/blog/source-directory/requirements.md#表示する内容の範囲-2
describe('SourceTableの表は表示専用 - 入力欄・保存ボタン・削除ボタンを一切持たない。情報源・採用基準の構成以外(掲載結果・継続度・注目度・収集ログ)は表示しない', () => {
  it('表に入力欄(input/textarea)が存在しないこと', () => {
    render(<SourceTable rows={[makeRow()]} />)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('表に保存・削除・編集のボタンが存在しないこと', () => {
    render(<SourceTable rows={[makeRow()]} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('列見出しがジャンル/選定方式/採用基準/情報源(+編)のみで、掲載結果・継続度・注目度・収集ログの列を持たないこと', () => {
    render(<SourceTable rows={[makeRow({ editionLabel: 'エンタメ編' })]} />)
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers).toEqual(['ジャンル', '編', '選定方式', '採用基準', '情報源'])
  })
})
