import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CreateBar from '@/app/spotify-playlist/components/CreateBar'

function renderBar(overrides: Partial<React.ComponentProps<typeof CreateBar>> = {}) {
  const onCreate = vi.fn()
  const onReset = vi.fn()
  const onPlaylistNameChange = vi.fn()
  const props: React.ComponentProps<typeof CreateBar> = {
    adoptedCount: 3,
    playlistName: 'ドライブ',
    onPlaylistNameChange,
    disabled: false,
    isCreating: false,
    onCreate,
    onReset,
    ...overrides,
  }
  render(<CreateBar {...props} />)
  return { onCreate, onReset, onPlaylistNameChange }
}

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#候補の確定方法-4、specs/spotify-playlist/playlist-create/requirements.md#プレイリスト名-1
describe('プレイリスト作成バー - 採用曲0件やプレイリスト名未入力では作成できない', () => {
  it('作成不可(disabled)のとき「プレイリストを作成」ボタンが押せないこと', () => {
    const { onCreate } = renderBar({ disabled: true })
    const button = screen.getByRole('button', { name: 'プレイリストを作成' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('作成可能なら押下で作成処理が呼ばれること', () => {
    const { onCreate } = renderBar()
    fireEvent.click(screen.getByRole('button', { name: 'プレイリストを作成' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('作成中はボタンがローディング表示になり、さらに無効化されること(連打で二重作成できない)', () => {
    const { onCreate } = renderBar({ isCreating: true })
    const button = screen.getByRole('button', { name: '作成中…' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('作成失敗時は日本語の定型メッセージを表示すること', () => {
    renderBar({ errorMessage: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    expect(screen.getByRole('alert').textContent).toContain('通信エラーが発生しました')
  })

  it('作成完了後はプレイリストへのリンクと「もう一度作る」に切り替わり、リンク先が実URLであること', () => {
    const { onReset } = renderBar({ completedUrl: 'https://open.spotify.com/playlist/xyz' })
    const link = screen.getByRole('link', { name: /作成したプレイリスト/ })
    expect(link.getAttribute('href')).toBe('https://open.spotify.com/playlist/xyz')
    // 作成前のUIは出ていない
    expect(screen.queryByRole('button', { name: 'プレイリストを作成' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'もう一度作る' }))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
