import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RegisterPage from '../../../app/board-game-rules/register/page'
import { createGameRequest } from '../../../app/board-game-rules/lib/gameRequests'

vi.mock('../../../app/board-game-rules/lib/gameRequests', () => ({
  createGameRequest: vi.fn(),
}))

function makePhoto(name = 'cover.jpg'): File {
  return new File(['dummy'], name, { type: 'image/jpeg' })
}

function selectPhoto(name?: string) {
  fireEvent.change(screen.getByLabelText('写真を選択'), { target: { files: [makePhoto(name)] } })
}

beforeEach(() => {
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() })
  vi.mocked(createGameRequest).mockReset().mockResolvedValue(true)
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#写真のアップロード-1、requirements.md#依頼の送信-5
describe('【登録依頼画面】写真必須のバリデーション - 写真が0枚の間は送信できない', () => {
  it('写真を選択していない状態では、送信ボタンが無効であること', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('button', { name: '依頼を送信する' }).disabled).toBe(true)
  })

  it('写真を1枚選択すると、送信ボタンが有効になること', () => {
    render(<RegisterPage />)
    selectPhoto()
    expect(screen.getByRole('button', { name: '依頼を送信する' }).disabled).toBe(false)
  })
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#分類情報の任意入力-3
describe('【登録依頼画面】分類情報の任意入力 - すべて未入力でも写真だけで送信できる', () => {
  it('分類情報を何も入力せず写真のみで送信すると、写真だけがcreateGameRequestに渡ること', async () => {
    render(<RegisterPage />)
    selectPhoto()
    fireEvent.click(screen.getByRole('button', { name: '依頼を送信する' }))

    await waitFor(() => expect(createGameRequest).toHaveBeenCalledTimes(1))
    const arg = vi.mocked(createGameRequest).mock.calls[0][0]
    expect(arg.photos).toHaveLength(1)
    expect(arg.name).toBeUndefined()
    expect(arg.genres).toEqual([])
  })

  it('ゲーム名・対応人数・ジャンルなどを入力すると、その内容がcreateGameRequestに渡ること', async () => {
    render(<RegisterPage />)
    selectPhoto()
    fireEvent.change(screen.getByLabelText('ゲーム名'), { target: { value: 'カタン' } })
    fireEvent.change(screen.getByLabelText('対応人数(下限)'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('対応人数(上限)'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '対戦' }))
    fireEvent.click(screen.getByRole('checkbox', { name: '戦略' }))
    fireEvent.click(screen.getByRole('button', { name: '依頼を送信する' }))

    await waitFor(() => expect(createGameRequest).toHaveBeenCalledTimes(1))
    const arg = vi.mocked(createGameRequest).mock.calls[0][0]
    expect(arg.name).toBe('カタン')
    expect(arg.minPlayers).toBe(3)
    expect(arg.maxPlayers).toBe(4)
    expect(arg.genres).toEqual(['対戦', '戦略'])
  })
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#入力値の制約-9
describe('【登録依頼画面】下限>上限の入力を送信できないようにする', () => {
  it('対応人数が下限>上限の場合、送信ボタンが無効になりエラーメッセージが表示されること', () => {
    render(<RegisterPage />)
    selectPhoto()
    fireEvent.change(screen.getByLabelText('対応人数(下限)'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('対応人数(上限)'), { target: { value: '2' } })

    expect(screen.getByRole('button', { name: '依頼を送信する' }).disabled).toBe(true)
    expect(screen.getByText('対応人数は下限が上限以下になるように入力してください。')).toBeTruthy()
  })

  it('プレイ時間が下限>上限の場合、送信ボタンが無効になりエラーメッセージが表示されること', () => {
    render(<RegisterPage />)
    selectPhoto()
    fireEvent.change(screen.getByLabelText('プレイ時間(下限・分)'), { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText('プレイ時間(上限・分)'), { target: { value: '30' } })

    expect(screen.getByRole('button', { name: '依頼を送信する' }).disabled).toBe(true)
    expect(screen.getByText('プレイ時間は下限が上限以下になるように入力してください。')).toBeTruthy()
  })

  it('下限=上限(境界値)は送信できること', () => {
    render(<RegisterPage />)
    selectPhoto()
    fireEvent.change(screen.getByLabelText('対応人数(下限)'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('対応人数(上限)'), { target: { value: '4' } })

    expect(screen.getByRole('button', { name: '依頼を送信する' }).disabled).toBe(false)
  })
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#写真のアップロード-2、requirements.md#依頼の送信-6、requirements.md#依頼の送信-7
describe('【登録依頼画面】送信中・成功・失敗の表示切り替え', () => {
  it('送信中は送信ボタンが無効化され、送信中であることが分かる表示が出ること(二重送信防止)', async () => {
    let resolveFn: (v: boolean) => void = () => {}
    vi.mocked(createGameRequest).mockImplementation(() => new Promise((resolve) => (resolveFn = resolve)))

    render(<RegisterPage />)
    selectPhoto()
    fireEvent.click(screen.getByRole('button', { name: '依頼を送信する' }))

    expect(screen.getByRole('button', { name: '送信中…' }).disabled).toBe(true)

    await act(async () => {
      resolveFn(true)
      await Promise.resolve()
    })
  })

  it('送信に成功すると、完了表示に切り替わり入力フォームは表示されなくなること', async () => {
    render(<RegisterPage />)
    selectPhoto()
    fireEvent.click(screen.getByRole('button', { name: '依頼を送信する' }))

    await waitFor(() =>
      expect(screen.getByText('受け付けました。運営者確認後に追加されます。')).toBeTruthy()
    )
    expect(screen.queryByLabelText('写真を選択')).toBeNull()
  })

  it('送信に失敗すると、失敗表示が出て入力内容が保持され、再送信できること', async () => {
    vi.mocked(createGameRequest).mockResolvedValueOnce(false)

    render(<RegisterPage />)
    selectPhoto()
    fireEvent.change(screen.getByLabelText('ゲーム名'), { target: { value: 'カタン' } })
    fireEvent.click(screen.getByRole('button', { name: '依頼を送信する' }))

    await waitFor(() => expect(screen.getByText('送信に失敗しました。もう一度お試しください。')).toBeTruthy())
    expect(screen.getByLabelText<HTMLInputElement>('ゲーム名').value).toBe('カタン')

    const retryButton = screen.getByRole('button', { name: '依頼を送信する' })
    expect(retryButton.disabled).toBe(false)

    vi.mocked(createGameRequest).mockResolvedValueOnce(true)
    fireEvent.click(retryButton)
    await waitFor(() => expect(createGameRequest).toHaveBeenCalledTimes(2))
  })
})
