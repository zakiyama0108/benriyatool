import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BookmarkListItem from '../../../app/future-digest/components/BookmarkListItem'
import { updateBookmark, deleteBookmark } from '../../../app/future-digest/lib/bookmarks'

vi.mock('../../../app/future-digest/lib/bookmarks', () => ({
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))

const updateBookmarkMock = vi.mocked(updateBookmark)
const deleteBookmarkMock = vi.mocked(deleteBookmark)

beforeEach(() => {
  updateBookmarkMock.mockReset()
  deleteBookmarkMock.mockReset()
})

// 仕様: specs/future-digest/bookmark/requirements.md#付箋の一覧-10、specs/future-digest/bookmark/requirements.md#付箋の一覧-11
describe('付箋一覧の1項目 - 見出し・ジャンルと時間軸のバッジ・メモを表示し、対象予測へ遷移できる', () => {
  it('予測の見出し・ジャンルと時間軸のバッジ・メモの内容が表示されること', () => {
    render(
      <BookmarkListItem
        articleId="2026-09-17"
        entry={{ heading: '自律走行がさらに普及する', genre: 'technology-ai', horizon: 'near' }}
        bookmark={{ id: 'bookmark-1', predictionId: 'technology-ai--near', memo: 'あとで詳しく読む' }}
      />
    )
    expect(screen.getByText('自律走行がさらに普及する')).toBeTruthy()
    expect(screen.getByText('近未来')).toBeTruthy()
    expect(screen.getByText('あとで詳しく読む')).toBeTruthy()
  })

  it('見出しのリンクが、対象記事の該当予測へのアンカー(/future-digest/<記事ID>#<予測ID>)であること', () => {
    render(
      <BookmarkListItem
        articleId="2026-09-17"
        entry={{ heading: '自律走行がさらに普及する', genre: 'technology-ai', horizon: 'near' }}
        bookmark={{ id: 'bookmark-1', predictionId: 'technology-ai--near', memo: 'あとで詳しく読む' }}
      />
    )
    const link = screen.getByRole('link', { name: '自律走行がさらに普及する' })
    expect(link.getAttribute('href')).toBe('/future-digest/2026-09-17#technology-ai--near')
  })
})

// 仕様: specs/future-digest/bookmark/requirements.md#付箋の一覧-12
describe('付箋一覧の各項目からの編集・削除 - 一覧画面だけで完結する(記事詳細ページに戻らない)', () => {
  it('「編集」から書き直して保存すると、その場でupdateBookmarkが呼ばれ、更新後の内容が表示されること', async () => {
    updateBookmarkMock.mockResolvedValue(true)
    render(
      <BookmarkListItem
        articleId="2026-09-17"
        entry={{ heading: '自律走行がさらに普及する', genre: 'technology-ai', horizon: 'near' }}
        bookmark={{ id: 'bookmark-1', predictionId: 'technology-ai--near', memo: 'あとで詳しく読む' }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '書き直した内容' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(screen.getByText('書き直した内容')).toBeTruthy())
    expect(updateBookmarkMock).toHaveBeenCalledWith('bookmark-1', '書き直した内容')
  })

  it('「削除」を押すと、その場でdeleteBookmarkが呼ばれ、削除後は「付箋を貼る」操作の表示になること', async () => {
    deleteBookmarkMock.mockResolvedValue(true)
    render(
      <BookmarkListItem
        articleId="2026-09-17"
        entry={{ heading: '自律走行がさらに普及する', genre: 'technology-ai', horizon: 'near' }}
        bookmark={{ id: 'bookmark-1', predictionId: 'technology-ai--near', memo: 'あとで詳しく読む' }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '付箋を貼る' })).toBeTruthy())
    expect(deleteBookmarkMock).toHaveBeenCalledWith('bookmark-1')
  })
})
