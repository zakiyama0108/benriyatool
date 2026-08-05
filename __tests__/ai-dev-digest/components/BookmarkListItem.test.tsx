import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BookmarkListItem from '../../../app/ai-dev-digest/components/BookmarkListItem'
import { updateBookmark, deleteBookmark } from '../../../app/ai-dev-digest/lib/bookmarks'

vi.mock('../../../app/ai-dev-digest/lib/bookmarks', () => ({
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

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#付箋した記事一覧-11、specs/ai-dev-digest/bookmark/requirements.md#付箋した記事一覧-12
describe('付箋一覧の1項目 - トピック見出し・付箋メモを表示し、対象トピックへ遷移できる', () => {
  it('トピック見出し・付箋メモの内容が表示されること', () => {
    render(
      <BookmarkListItem
        articleDate="2026-08-01"
        topicHeading="Anthropicが新モデルを発表"
        bookmark={{ id: 'bookmark-1', topicId: 'topic-1', memo: 'あとで詳しく読む' }}
      />
    )
    expect(screen.getByText('Anthropicが新モデルを発表')).toBeTruthy()
    expect(screen.getByText('あとで詳しく読む')).toBeTruthy()
  })

  it('トピック見出しのリンクが、対象記事の該当トピックへのアンカー(/ai-dev-digest/<date>#<topicId>)であること', () => {
    render(
      <BookmarkListItem
        articleDate="2026-08-01"
        topicHeading="Anthropicが新モデルを発表"
        bookmark={{ id: 'bookmark-1', topicId: 'topic-1', memo: 'あとで詳しく読む' }}
      />
    )
    const link = screen.getByRole('link', { name: 'Anthropicが新モデルを発表' })
    expect(link.getAttribute('href')).toBe('/ai-dev-digest/2026-08-01#topic-1')
  })
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#付箋した記事一覧-13
describe('付箋一覧の各項目からの編集・削除 - 一覧画面だけで完結する(記事詳細ページに戻らない)', () => {
  it('「編集」から書き直して保存すると、その場でupdateBookmarkが呼ばれ、更新後の内容が表示されること', async () => {
    updateBookmarkMock.mockResolvedValue(true)
    render(
      <BookmarkListItem
        articleDate="2026-08-01"
        topicHeading="Anthropicが新モデルを発表"
        bookmark={{ id: 'bookmark-1', topicId: 'topic-1', memo: 'あとで詳しく読む' }}
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
        articleDate="2026-08-01"
        topicHeading="Anthropicが新モデルを発表"
        bookmark={{ id: 'bookmark-1', topicId: 'topic-1', memo: 'あとで詳しく読む' }}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '付箋を貼る' })).toBeTruthy())
    expect(deleteBookmarkMock).toHaveBeenCalledWith('bookmark-1')
  })
})
