import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BookmarkPanel from '../../../app/ai-dev-digest/components/BookmarkPanel'
import { createBookmark, updateBookmark, deleteBookmark } from '../../../app/ai-dev-digest/lib/bookmarks'

vi.mock('../../../app/ai-dev-digest/lib/bookmarks', () => ({
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))

const createBookmarkMock = vi.mocked(createBookmark)
const updateBookmarkMock = vi.mocked(updateBookmark)
const deleteBookmarkMock = vi.mocked(deleteBookmark)

beforeEach(() => {
  createBookmarkMock.mockReset()
  updateBookmarkMock.mockReset()
  deleteBookmarkMock.mockReset()
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#トピックへの付箋-1、specs/ai-dev-digest/bookmark/requirements.md#トピックへの付箋-2、specs/ai-dev-digest/bookmark/requirements.md#トピックへの付箋-3、specs/ai-dev-digest/bookmark/requirements.md#トピックへの付箋-6、specs/ai-dev-digest/bookmark/requirements.md#文字数・件数の制約-3
describe('付箋の新規作成 - 未付箋のトピックで「付箋を貼る」操作からその場でメモを保存する', () => {
  it('initialBookmarkがnullの場合、「付箋を貼る」操作のみが表示されること', () => {
    render(<BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={null} />)
    expect(screen.getByRole('button', { name: '付箋を貼る' })).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('「付箋を貼る」を押すと、その場にメモ入力欄と「保存」「キャンセル」操作が展開すること(別画面へは遷移しない)', () => {
    render(<BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={null} />)
    fireEvent.click(screen.getByRole('button', { name: '付箋を貼る' }))
    expect(screen.getByRole('textbox')).toBeTruthy()
    expect(screen.getByRole('button', { name: '保存' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy()
  })

  it('入力欄を「保存」を押すと、articleDate・topicId・トリムしたメモでcreateBookmarkが呼ばれ、成功時は入力欄が閉じ保存内容が表示されること', async () => {
    createBookmarkMock.mockResolvedValue('bookmark-1')
    const onChange = vi.fn()
    render(<BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '付箋を貼る' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  あとで読み返す  ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())
    expect(createBookmarkMock).toHaveBeenCalledWith({ articleDate: '2026-08-01', topicId: 'topic-1', memo: 'あとで読み返す' })
    expect(screen.getByText('あとで読み返す')).toBeTruthy()
    expect(onChange).toHaveBeenCalledWith({ id: 'bookmark-1', memo: 'あとで読み返す' })
  })

  it('入力が空文字、または空白文字のみの場合、保存ボタンが無効化され保存されないこと', () => {
    render(<BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={null} />)
    fireEvent.click(screen.getByRole('button', { name: '付箋を貼る' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    const saveButton = screen.getByRole('button', { name: '保存' })
    expect(saveButton.hasAttribute('disabled')).toBe(true)
    fireEvent.click(saveButton)
    expect(createBookmarkMock).not.toHaveBeenCalled()
  })

  it('入力欄の最大文字数が200文字に制限されること(それ以上入力できない)', () => {
    render(<BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={null} />)
    fireEvent.click(screen.getByRole('button', { name: '付箋を貼る' }))
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox')
    expect(textarea.maxLength).toBe(200)
  })

  it('保存に失敗した場合、入力欄が開いたまま失敗表示になり、入力内容が消えないこと', async () => {
    createBookmarkMock.mockResolvedValue(null)
    render(<BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={null} />)
    fireEvent.click(screen.getByRole('button', { name: '付箋を貼る' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'あとで読み返す' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(screen.getByText(/保存に失敗しました/)).toBeTruthy())
    expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe('あとで読み返す')
  })

  it('「キャンセル」を押すと、入力欄が閉じ「付箋を貼る」操作の表示に戻ること', () => {
    render(<BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={null} />)
    fireEvent.click(screen.getByRole('button', { name: '付箋を貼る' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '下書き' } })
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByRole('button', { name: '付箋を貼る' })).toBeTruthy()
  })
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#トピックへの付箋-4、specs/ai-dev-digest/bookmark/requirements.md#付箋の編集・削除-7、specs/ai-dev-digest/bookmark/requirements.md#付箋の編集・削除-8、specs/ai-dev-digest/bookmark/requirements.md#付箋の編集・削除-9
describe('付箋の編集・削除 - 既に付箋を貼ったトピックで内容を書き直す、または削除する', () => {
  it('initialBookmarkがある場合、保存済みのメモ内容と「編集」「削除」操作が表示されること', () => {
    render(
      <BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={{ id: 'bookmark-1', memo: '気になる' }} />
    )
    expect(screen.getByText('気になる')).toBeTruthy()
    expect(screen.getByRole('button', { name: '編集' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '削除' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '付箋を貼る' })).toBeNull()
  })

  it('「編集」を押すと、保存済み内容を初期値にその場で入力欄が展開すること', () => {
    render(
      <BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={{ id: 'bookmark-1', memo: '気になる' }} />
    )
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe('気になる')
  })

  it('編集して保存すると、新規作成ではなく既存の付箋(同じid)がupdateBookmarkで上書き保存され、更新後の内容が表示されること', async () => {
    updateBookmarkMock.mockResolvedValue(true)
    const onChange = vi.fn()
    render(
      <BookmarkPanel
        articleDate="2026-08-01"
        topicId="topic-1"
        initialBookmark={{ id: 'bookmark-1', memo: '気になる' }}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '書き直した内容' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(screen.getByText('書き直した内容')).toBeTruthy())
    expect(updateBookmarkMock).toHaveBeenCalledWith('bookmark-1', '書き直した内容')
    expect(createBookmarkMock).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith({ id: 'bookmark-1', memo: '書き直した内容' })
  })

  it('編集の保存に失敗した場合、入力欄が開いたまま失敗表示になり、入力内容が消えないこと', async () => {
    updateBookmarkMock.mockResolvedValue(false)
    render(
      <BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={{ id: 'bookmark-1', memo: '気になる' }} />
    )
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '書き直した内容' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(screen.getByText(/保存に失敗しました/)).toBeTruthy())
    expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe('書き直した内容')
  })

  it('「削除」を押して削除に成功すると、「未付箋」の表示(「付箋を貼る」操作)に戻ること', async () => {
    deleteBookmarkMock.mockResolvedValue(true)
    const onChange = vi.fn()
    render(
      <BookmarkPanel
        articleDate="2026-08-01"
        topicId="topic-1"
        initialBookmark={{ id: 'bookmark-1', memo: '気になる' }}
        onChange={onChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '付箋を貼る' })).toBeTruthy())
    expect(deleteBookmarkMock).toHaveBeenCalledWith('bookmark-1')
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('削除に失敗した場合、「付箋あり」の表示のまま失敗表示になること', async () => {
    deleteBookmarkMock.mockResolvedValue(false)
    render(
      <BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={{ id: 'bookmark-1', memo: '気になる' }} />
    )
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => expect(screen.getByText(/削除に失敗しました/)).toBeTruthy())
    expect(screen.getByText('気になる')).toBeTruthy()
  })
})

// 仕様: specs/ai-dev-digest/bookmark/design.md#エラーハンドリング
describe('保存中・削除中の二重操作防止 - 処理中は同じ操作ボタンを無効化する', () => {
  it('保存処理が完了するまで保存ボタンが無効化され、連続クリックしてもcreateBookmarkが1回しか呼ばれないこと', async () => {
    let resolveCreate: (id: string | null) => void = () => {}
    createBookmarkMock.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve }))
    render(<BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={null} />)
    fireEvent.click(screen.getByRole('button', { name: '付箋を貼る' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'あとで読み返す' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    const saveButton = screen.getByRole('button', { name: '保存' })
    expect(saveButton.hasAttribute('disabled')).toBe(true)
    fireEvent.click(saveButton)
    expect(createBookmarkMock).toHaveBeenCalledTimes(1)

    resolveCreate('bookmark-1')
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull())
  })

  it('削除処理が完了するまで削除ボタンが無効化され、連続クリックしてもdeleteBookmarkが1回しか呼ばれないこと', async () => {
    let resolveDelete: (ok: boolean) => void = () => {}
    deleteBookmarkMock.mockImplementation(() => new Promise((resolve) => { resolveDelete = resolve }))
    render(
      <BookmarkPanel articleDate="2026-08-01" topicId="topic-1" initialBookmark={{ id: 'bookmark-1', memo: '気になる' }} />
    )
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    const deleteButton = screen.getByRole('button', { name: '削除' })
    expect(deleteButton.hasAttribute('disabled')).toBe(true)
    fireEvent.click(deleteButton)
    expect(deleteBookmarkMock).toHaveBeenCalledTimes(1)

    resolveDelete(true)
    await waitFor(() => expect(screen.getByRole('button', { name: '付箋を貼る' })).toBeTruthy())
  })
})
