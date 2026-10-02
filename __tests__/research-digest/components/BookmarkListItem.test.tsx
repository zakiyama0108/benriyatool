import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BookmarkListItem from '../../../app/research-digest/components/BookmarkListItem'
import { updateBookmark, deleteBookmark } from '../../../app/research-digest/lib/bookmarks'

vi.mock('../../../app/research-digest/lib/bookmarks', () => ({
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

function renderItem(onDeleted: () => void = () => {}) {
  render(
    <BookmarkListItem
      articleId="2026-10-05"
      entry={{ heading: '運動が記憶力を高める可能性', genre: 'sleep-exercise' }}
      bookmark={{ id: 'bookmark-1', findingId: 'sleep-exercise', memo: 'あとで詳しく読む' }}
      onDeleted={onDeleted}
    />
  )
}

// 仕様: specs/research-digest/bookmark/requirements.md#付箋の一覧-10、specs/research-digest/bookmark/requirements.md#付箋の一覧-11
describe('付箋一覧の1項目 - 見出し・ジャンルのバッジ・メモを表示し、対象研究へ遷移できる', () => {
  it('研究の見出し・ジャンルのバッジ・メモの内容が表示されること', () => {
    renderItem()
    expect(screen.getByText('運動が記憶力を高める可能性')).toBeTruthy()
    expect(screen.getByText('睡眠・運動')).toBeTruthy()
    expect(screen.getByText('あとで詳しく読む')).toBeTruthy()
  })

  it('見出しのリンクが、対象記事の該当研究へのアンカー(/research-digest/<記事ID>#<研究ID>)であること', () => {
    renderItem()
    const link = screen.getByRole('link', { name: '運動が記憶力を高める可能性' })
    expect(link.getAttribute('href')).toBe('/research-digest/2026-10-05#sleep-exercise')
  })
})

// 仕様: specs/research-digest/bookmark/requirements.md#付箋の一覧-12
describe('付箋一覧の各項目からの編集・削除 - 一覧画面だけで完結する(記事詳細ページに戻らない)', () => {
  it('「編集」から書き直して保存すると、その場で上書き保存され、更新後の内容が表示されること', async () => {
    updateBookmarkMock.mockResolvedValue(true)
    renderItem()
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '書き直した内容' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(screen.getByText('書き直した内容')).toBeTruthy())
    expect(updateBookmarkMock).toHaveBeenCalledWith('bookmark-1', '書き直した内容')
  })

  it('「削除」に成功すると、その付箋が削除され、一覧側へ削除されたことが伝わること', async () => {
    deleteBookmarkMock.mockResolvedValue(true)
    const onDeleted = vi.fn()
    renderItem(onDeleted)
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    expect(deleteBookmarkMock).toHaveBeenCalledWith('bookmark-1')
  })

  it('「削除」に失敗した場合は、一覧側へ削除は伝わらず失敗の表示が出ること', async () => {
    deleteBookmarkMock.mockResolvedValue(false)
    const onDeleted = vi.fn()
    renderItem(onDeleted)
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    await waitFor(() => expect(screen.getByText(/削除に失敗しました/)).toBeTruthy())
    expect(onDeleted).not.toHaveBeenCalled()
  })
})
