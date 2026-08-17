import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import GamePhotoUploader from '../../../app/board-game-rules/components/GamePhotoUploader'

function makePhoto(name: string): File {
  return new File(['dummy'], name, { type: 'image/jpeg' })
}

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  })
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#ゲーム紹介画像のアップロード-9
describe('【登録依頼】ゲーム紹介画像アップローダー - 複数枚の任意選択・プレビュー表示・削除ができる', () => {
  it('画像を選択すると、選択した画像がonChangeで渡されプレビューが表示されること', () => {
    const onChange = vi.fn()
    render(<GamePhotoUploader photos={[]} onChange={onChange} />)

    const photo = makePhoto('package.jpg')
    fireEvent.change(screen.getByLabelText('ゲーム紹介画像を選択'), { target: { files: [photo] } })

    expect(onChange).toHaveBeenCalledWith([photo])
  })

  it('複数枚をまとめて選択すると、すべてがonChangeに渡されること', () => {
    const onChange = vi.fn()
    render(<GamePhotoUploader photos={[]} onChange={onChange} />)

    const photo1 = makePhoto('package.jpg')
    const photo2 = makePhoto('play.jpg')
    fireEvent.change(screen.getByLabelText('ゲーム紹介画像を選択'), { target: { files: [photo1, photo2] } })

    expect(onChange).toHaveBeenCalledWith([photo1, photo2])
  })

  it('選択済みの画像の枚数分、プレビュー画像が表示されること', () => {
    const photos = [makePhoto('a.jpg'), makePhoto('b.jpg')]
    render(<GamePhotoUploader photos={photos} onChange={vi.fn()} />)

    expect(screen.getByAltText('ゲーム紹介画像 1枚目')).toBeTruthy()
    expect(screen.getByAltText('ゲーム紹介画像 2枚目')).toBeTruthy()
  })

  it('削除ボタンを押すと、その画像だけを除いた配列がonChangeに渡されること', () => {
    const onChange = vi.fn()
    const photo1 = makePhoto('a.jpg')
    const photo2 = makePhoto('b.jpg')
    render(<GamePhotoUploader photos={[photo1, photo2]} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('ゲーム紹介画像 1枚目を削除'))

    expect(onChange).toHaveBeenCalledWith([photo2])
  })

  it('0枚(未選択)のまま(最低1枚の必須表示がない)、削除・追加操作の選択欄は有効なままであること(任意項目のため)', () => {
    render(<GamePhotoUploader photos={[]} onChange={vi.fn()} />)

    expect(screen.getByLabelText<HTMLInputElement>('ゲーム紹介画像を選択').disabled).toBe(false)
  })
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#ゲーム紹介画像のアップロード-9
describe('【登録依頼】ゲーム紹介画像アップローダー - 1回あたりの枚数上限(20枚、ルールブック写真とは別枠)', () => {
  it('上限に達している状態では、選択欄が無効化され上限に達した旨のメッセージが表示されること', () => {
    const photos = Array.from({ length: 20 }, (_, i) => makePhoto(`p${i}.jpg`))
    render(<GamePhotoUploader photos={photos} onChange={vi.fn()} />)

    expect(screen.getByLabelText<HTMLInputElement>('ゲーム紹介画像を選択').disabled).toBe(true)
    expect(screen.getByText('上限の20枚に達しました。これ以上は追加できません。')).toBeTruthy()
  })

  it('上限を超える枚数をまとめて選択すると、上限までしか追加されないこと', () => {
    const onChange = vi.fn()
    const photos = Array.from({ length: 18 }, (_, i) => makePhoto(`p${i}.jpg`))
    render(<GamePhotoUploader photos={photos} onChange={onChange} />)

    const extra = [makePhoto('a.jpg'), makePhoto('b.jpg'), makePhoto('c.jpg')]
    fireEvent.change(screen.getByLabelText('ゲーム紹介画像を選択'), { target: { files: extra } })

    expect(onChange).toHaveBeenCalledWith([...photos, extra[0], extra[1]])
  })
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#ゲーム紹介画像のアップロード-10、specs/board-game-rules/game-registration/requirements.md#ゲーム紹介画像のアップロード-11
describe('【登録依頼】ゲーム紹介画像の並び替え - 「メイン画像にする」操作で先頭へ移動する', () => {
  it('先頭(1枚目)の画像に「メイン」の印が表示されること', () => {
    const photos = [makePhoto('a.jpg'), makePhoto('b.jpg')]
    render(<GamePhotoUploader photos={photos} onChange={vi.fn()} />)

    expect(screen.getByText('メイン')).toBeTruthy()
  })

  it('2枚目以降の画像で「メイン画像にする」を押すと、その画像が先頭へ移動し他は順序を保ったまま後ろへずれること', () => {
    const onChange = vi.fn()
    const photo1 = makePhoto('a.jpg')
    const photo2 = makePhoto('b.jpg')
    const photo3 = makePhoto('c.jpg')
    render(<GamePhotoUploader photos={[photo1, photo2, photo3]} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('ゲーム紹介画像 3枚目をメイン画像にする'))

    expect(onChange).toHaveBeenCalledWith([photo3, photo1, photo2])
  })

  it('先頭の画像には「メイン画像にする」ボタンが表示されないこと(既にメインのため)', () => {
    const photos = [makePhoto('a.jpg'), makePhoto('b.jpg')]
    render(<GamePhotoUploader photos={photos} onChange={vi.fn()} />)

    expect(screen.queryByLabelText('ゲーム紹介画像 1枚目をメイン画像にする')).toBeNull()
  })
})
