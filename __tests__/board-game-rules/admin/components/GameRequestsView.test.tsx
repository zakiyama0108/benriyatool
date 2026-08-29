import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GameRequestsView from '../../../../app/board-game-rules/admin/components/GameRequestsView'
import type { GameRequest } from '../../../../app/board-game-rules/admin/lib/gameRequests'

// ゲーム紹介画像プレビューに使う公開URL変換(gamePhotos.ts)は別spec(game-list T8)で検証済みのためモックする
vi.mock('../../../../app/board-game-rules/lib/gamePhotos', () => ({
  getGamePhotoUrl: vi.fn((path: string) => `https://example.com/game-photos/${path}`),
}))

function makeRequest(overrides: Partial<GameRequest> = {}): GameRequest {
  return {
    id: 'req-1',
    photoPaths: ['req-1/0.jpg'],
    introPhotoPaths: [],
    name: 'カタン',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: ['対戦'],
    minAge: null,
    difficulty: null,
    publisher: null,
    author: null,
    hasJapaneseRules: null,
    awards: null,
    releaseYear: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    processedAt: null,
    ...overrides,
  }
}

// 仕様: specs/board-game-rules/admin/requirements.md#登録依頼の確認-8、specs/board-game-rules/admin/requirements.md#登録依頼の確認-9、specs/board-game-rules/admin/requirements.md#登録依頼の確認-10
describe('【管理画面】登録依頼一覧 - 写真・分類情報の表示、処理済みマーク・削除の導線', () => {
  it('依頼のゲーム名・分類情報が表示されること', () => {
    render(<GameRequestsView requests={[makeRequest()]} onMarkProcessed={vi.fn()} onDelete={vi.fn()} onViewPhotos={vi.fn()} />)
    expect(screen.getByText('カタン')).toBeTruthy()
  })

  it('ゲーム名が未入力の依頼は「ゲーム名未入力」と表示されること', () => {
    render(
      <GameRequestsView
        requests={[makeRequest({ name: null })]}
        onMarkProcessed={vi.fn()}
        onDelete={vi.fn()}
        onViewPhotos={vi.fn()}
      />
    )
    expect(screen.getByText('ゲーム名未入力')).toBeTruthy()
  })

  it('未処理の依頼には「未処理」、処理済みの依頼には「処理済み」と表示されること', () => {
    render(
      <GameRequestsView
        requests={[makeRequest({ id: 'req-1', processedAt: null }), makeRequest({ id: 'req-2', processedAt: '2026-08-02T00:00:00.000Z' })]}
        onMarkProcessed={vi.fn()}
        onDelete={vi.fn()}
        onViewPhotos={vi.fn()}
      />
    )
    expect(screen.getByText('未処理')).toBeTruthy()
    expect(screen.getByText('処理済み')).toBeTruthy()
  })

  it('未処理の依頼で「処理済みにする」を押すと、対象依頼IDでonMarkProcessedが呼ばれること', () => {
    const onMarkProcessed = vi.fn()
    render(
      <GameRequestsView
        requests={[makeRequest()]}
        onMarkProcessed={onMarkProcessed}
        onDelete={vi.fn()}
        onViewPhotos={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '処理済みにする' }))
    expect(onMarkProcessed).toHaveBeenCalledWith('req-1')
  })

  it('処理済みの依頼には「処理済みにする」ボタンが表示されないこと', () => {
    render(
      <GameRequestsView
        requests={[makeRequest({ processedAt: '2026-08-02T00:00:00.000Z' })]}
        onMarkProcessed={vi.fn()}
        onDelete={vi.fn()}
        onViewPhotos={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: '処理済みにする' })).toBeNull()
  })

  it('削除ボタンを押すと、対象依頼IDでonDeleteが呼ばれること', () => {
    const onDelete = vi.fn()
    render(<GameRequestsView requests={[makeRequest()]} onMarkProcessed={vi.fn()} onDelete={onDelete} onViewPhotos={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(onDelete).toHaveBeenCalledWith('req-1')
  })

  it('「写真を確認」ボタンを押すとonViewPhotosが呼ばれ、取得できた写真が表示されること', async () => {
    const onViewPhotos = vi.fn().mockResolvedValue([{ path: 'req-1/0.jpg', url: 'https://example.com/a.jpg' }])
    render(
      <GameRequestsView requests={[makeRequest()]} onMarkProcessed={vi.fn()} onDelete={vi.fn()} onViewPhotos={onViewPhotos} />
    )
    fireEvent.click(screen.getByRole('button', { name: '写真を確認' }))
    expect(onViewPhotos).toHaveBeenCalledWith(['req-1/0.jpg'])
    await waitFor(() => expect(screen.getByAltText('依頼された元写真')).toBeTruthy())
  })

  it('依頼が0件のとき、その旨が表示されること', () => {
    render(<GameRequestsView requests={[]} onMarkProcessed={vi.fn()} onDelete={vi.fn()} onViewPhotos={vi.fn()} />)
    expect(screen.getByText('登録依頼はありません。')).toBeTruthy()
  })

  // 仕様: specs/board-game-rules/admin/design.md「エラーハンドリング」(処理中は該当操作を無効化し二重実行を防ぐ)
  it('処理済みにするの処理中は、ボタンが無効化され連打しても1回しか呼ばれないこと', async () => {
    let resolveFn: () => void = () => {}
    const onMarkProcessed = vi.fn(() => new Promise<void>((r) => (resolveFn = r)))
    render(
      <GameRequestsView requests={[makeRequest()]} onMarkProcessed={onMarkProcessed} onDelete={vi.fn()} onViewPhotos={vi.fn()} />
    )

    const button = screen.getByRole('button', { name: '処理済みにする' })
    fireEvent.click(button)
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onMarkProcessed).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFn()
      await Promise.resolve()
    })
  })

  it('削除の処理中は、ボタンが無効化され連打しても1回しか呼ばれないこと', async () => {
    let resolveFn: () => void = () => {}
    const onDelete = vi.fn(() => new Promise<void>((r) => (resolveFn = r)))
    render(<GameRequestsView requests={[makeRequest()]} onMarkProcessed={vi.fn()} onDelete={onDelete} onViewPhotos={vi.fn()} />)

    const button = screen.getByRole('button', { name: '削除' })
    fireEvent.click(button)
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onDelete).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFn()
      await Promise.resolve()
    })
  })

  it('写真を確認の処理中は、ボタンが無効化され連打しても1回しか呼ばれないこと', async () => {
    let resolveFn: (v: { path: string; url: string | null }[]) => void = () => {}
    const onViewPhotos = vi.fn(() => new Promise<{ path: string; url: string | null }[]>((r) => (resolveFn = r)))
    render(
      <GameRequestsView requests={[makeRequest()]} onMarkProcessed={vi.fn()} onDelete={vi.fn()} onViewPhotos={onViewPhotos} />
    )

    const button = screen.getByRole('button', { name: '写真を確認' })
    fireEvent.click(button)
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onViewPhotos).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFn([])
      await Promise.resolve()
    })
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#ゲーム紹介画像の確認・自動補完-11、specs/board-game-rules/admin/requirements.md#ゲーム紹介画像の確認・自動補完-12、specs/board-game-rules/admin/design.md#登録依頼を確認する処理
describe('【管理画面】登録依頼一覧 - ゲーム紹介画像のプレビュー(0枚時は自動補完の案内)', () => {
  it('ゲーム紹介画像が添付されている依頼では、公開URLでプレビュー表示されること', () => {
    render(
      <GameRequestsView
        requests={[makeRequest({ introPhotoPaths: ['req-1/0.jpg', 'req-1/1.jpg'] })]}
        onMarkProcessed={vi.fn()}
        onDelete={vi.fn()}
        onViewPhotos={vi.fn()}
      />
    )

    const image = screen.getByAltText<HTMLImageElement>('依頼されたゲーム紹介画像 1枚目')
    expect(image.src).toBe('https://example.com/game-photos/req-1/0.jpg')
    expect(screen.getByAltText('依頼されたゲーム紹介画像 2枚目')).toBeTruthy()
  })

  it('ゲーム紹介画像が0枚の依頼では、自動補完される旨の案内が表示されること', () => {
    render(
      <GameRequestsView
        requests={[makeRequest({ introPhotoPaths: [] })]}
        onMarkProcessed={vi.fn()}
        onDelete={vi.fn()}
        onViewPhotos={vi.fn()}
      />
    )

    expect(screen.getByText('紹介画像なし(登録時に自動補完されます)')).toBeTruthy()
    expect(screen.queryByAltText(/依頼されたゲーム紹介画像/)).toBeNull()
  })
})
