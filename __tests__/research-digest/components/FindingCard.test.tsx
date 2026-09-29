import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FindingCard from '../../../app/research-digest/components/FindingCard'
import type { GenreEntry } from '../../../app/research-digest/lib/sortGenres'
import type { EmptyGenre, Finding } from '../../../app/research-digest/lib/types'
import { GENRE_ORDER } from '../../../app/research-digest/lib/types'

// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるため、表示切り替えの検証用にモックする
vi.mock('../../../app/research-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

function findingEntry(overrides: Partial<Finding> = {}): GenreEntry {
  const finding: Finding = {
    id: GENRE_ORDER[0],
    genre: GENRE_ORDER[0],
    heading: '運動が記憶力を高める可能性',
    body: 'あ'.repeat(250),
    impact: 'high',
    impactReason: '誰にでも取り入れやすい習慣に関わるため',
    sourceTitle: 'Exercise and memory',
    sourceName: 'Journal of Health',
    sourceUrl: 'https://example.com/paper',
    doi: null,
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
  return { genre: finding.genre, kind: 'finding', finding }
}

function emptyEntry(overrides: Partial<EmptyGenre>): GenreEntry {
  const emptyGenre: EmptyGenre = { genre: GENRE_ORDER[0], reason: 'no-candidate', ...overrides }
  return { genre: emptyGenre.genre, kind: 'empty', emptyGenre }
}

// 仕様: specs/research-digest/article-detail/requirements.md#記事本文の表示-2
describe('研究があるジャンルの表示', () => {
  it('見出し・本文・影響度の根拠と、出典(論文名のリンク・掲載誌名・年)が表示され、リンクは新規タブで開くこと', () => {
    render(<FindingCard entry={findingEntry()} articleId="2026-10-05" isAdmin={false} />)

    expect(screen.getByText('運動が記憶力を高める可能性')).toBeTruthy()
    expect(screen.getByText('あ'.repeat(250))).toBeTruthy()
    expect(screen.getByText('影響度の根拠: 誰にでも取り入れやすい習慣に関わるため')).toBeTruthy()
    expect(screen.getByText(/詳しくは元の論文・発表を読む/)).toBeTruthy()
    expect(screen.getByText(/Journal of Health/)).toBeTruthy()
    expect(screen.getByText(/2025年/)).toBeTruthy()

    const link = screen.getByRole<HTMLAnchorElement>('link', { name: 'Exercise and memory' })
    expect(link.href).toBe('https://example.com/paper')
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener')
    expect(link.rel).toContain('noreferrer')
  })

  it('論文の年が分からない場合、年を表示しないこと', () => {
    render(<FindingCard entry={findingEntry({ publishedYear: null })} articleId="2026-10-05" isAdmin={false} />)
    expect(screen.getByText(/Journal of Health/)).toBeTruthy()
    expect(screen.queryByText(/年/)).toBeNull()
  })

  it('査読前の論文には「査読前」のバッジが表示されること', () => {
    render(<FindingCard entry={findingEntry({ isPreprint: true })} articleId="2026-10-05" isAdmin={false} />)
    expect(screen.getByText('査読前')).toBeTruthy()
  })

  // 仕様: specs/research-digest/article-detail/requirements.md#運営者向けフィードバック-11
  it('運営者本人のときだけフィードバック入力欄が表示されること', () => {
    const { rerender } = render(<FindingCard entry={findingEntry()} articleId="2026-10-05" isAdmin={true} />)
    expect(screen.getByRole('textbox')).toBeTruthy()
    rerender(<FindingCard entry={findingEntry()} articleId="2026-10-05" isAdmin={false} />)
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

// 仕様: specs/research-digest/article-detail/requirements.md#記事本文の表示-3、specs/research-digest/article-detail/requirements.md#記事本文の表示-4、specs/research-digest/article-detail/requirements.md#記事本文の表示-5
describe('掲載できなかったジャンルの表示(候補なし・収集失敗・生成失敗を異なる文言で区別する)', () => {
  it('候補が見つからなかったジャンルに「候補が見つかりませんでした」が表示され、出典リンクとフィードバック欄が出ないこと', () => {
    render(<FindingCard entry={emptyEntry({ reason: 'no-candidate' })} articleId="2026-10-05" isAdmin={true} />)
    expect(screen.getByText('候補が見つかりませんでした')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('収集に失敗したジャンルに、理由を含む「今回は記事を収集できませんでした」が表示されること(候補なしと異なる文言)', () => {
    render(
      <FindingCard
        entry={emptyEntry({ reason: 'collection-failed', collectionFailureReason: 'timeout' })}
        articleId="2026-10-05"
        isAdmin={true}
      />
    )
    expect(screen.getByText(/今回は記事を収集できませんでした/)).toBeTruthy()
    expect(screen.getByText(/調査が時間内に終わりませんでした/)).toBeTruthy()
    expect(screen.queryByText('候補が見つかりませんでした')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('生成に失敗した記事に「今回は記事を用意できませんでした」が表示されること', () => {
    render(<FindingCard entry={emptyEntry({ reason: 'generation-failed' })} articleId="2026-10-05" isAdmin={true} />)
    expect(screen.getByText('今回は記事を用意できませんでした')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
