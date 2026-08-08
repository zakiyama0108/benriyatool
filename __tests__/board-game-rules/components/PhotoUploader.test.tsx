import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PhotoUploader from '../../../app/board-game-rules/components/PhotoUploader'

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

// 仕様: specs/board-game-rules/game-registration/requirements.md#写真のアップロード-1
describe('【登録依頼】写真アップローダー - 複数枚の写真選択・プレビュー表示・削除ができる', () => {
  it('写真を選択すると、選択した写真がonChangeで渡されプレビューが表示されること', () => {
    const onChange = vi.fn()
    render(<PhotoUploader photos={[]} onChange={onChange} />)

    const photo = makePhoto('cover.jpg')
    fireEvent.change(screen.getByLabelText('写真を選択'), { target: { files: [photo] } })

    expect(onChange).toHaveBeenCalledWith([photo])
  })

  it('複数枚をまとめて選択すると、すべてがonChangeに渡されること', () => {
    const onChange = vi.fn()
    render(<PhotoUploader photos={[]} onChange={onChange} />)

    const photo1 = makePhoto('cover.jpg')
    const photo2 = makePhoto('page1.jpg')
    fireEvent.change(screen.getByLabelText('写真を選択'), { target: { files: [photo1, photo2] } })

    expect(onChange).toHaveBeenCalledWith([photo1, photo2])
  })

  it('既に選択済みの写真がある状態で追加選択すると、既存に追加されること(累積)', () => {
    const onChange = vi.fn()
    const existing = makePhoto('cover.jpg')
    render(<PhotoUploader photos={[existing]} onChange={onChange} />)

    const added = makePhoto('page1.jpg')
    fireEvent.change(screen.getByLabelText('写真を選択'), { target: { files: [added] } })

    expect(onChange).toHaveBeenCalledWith([existing, added])
  })

  it('選択済みの写真の枚数分、プレビュー画像が表示されること', () => {
    const photos = [makePhoto('a.jpg'), makePhoto('b.jpg')]
    render(<PhotoUploader photos={photos} onChange={vi.fn()} />)

    expect(screen.getByAltText('アップロード予定の写真 1枚目')).toBeTruthy()
    expect(screen.getByAltText('アップロード予定の写真 2枚目')).toBeTruthy()
  })

  it('削除ボタンを押すと、その写真だけを除いた配列がonChangeに渡されること', () => {
    const onChange = vi.fn()
    const photo1 = makePhoto('a.jpg')
    const photo2 = makePhoto('b.jpg')
    render(<PhotoUploader photos={[photo1, photo2]} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('1枚目の写真を削除'))

    expect(onChange).toHaveBeenCalledWith([photo2])
  })
})

// 仕様: specs/board-game-rules/admin/design.md「元写真の非公開Storage」(匿名アップロードの量的制約。
// 枚数上限は登録画面(クライアント)側で担保する)
describe('【登録依頼】写真アップローダー - 1回あたりの枚数上限(20枚)を画面側で制限する', () => {
  it('上限ちょうどまでは選択できること', () => {
    const onChange = vi.fn()
    const photos = Array.from({ length: 19 }, (_, i) => makePhoto(`p${i}.jpg`))
    render(<PhotoUploader photos={photos} onChange={onChange} />)

    const last = makePhoto('last.jpg')
    fireEvent.change(screen.getByLabelText('写真を選択'), { target: { files: [last] } })

    expect(onChange).toHaveBeenCalledWith([...photos, last])
  })

  it('上限を超える枚数をまとめて選択すると、上限までしか追加されないこと', () => {
    const onChange = vi.fn()
    const photos = Array.from({ length: 18 }, (_, i) => makePhoto(`p${i}.jpg`))
    render(<PhotoUploader photos={photos} onChange={onChange} />)

    const extra = [makePhoto('a.jpg'), makePhoto('b.jpg'), makePhoto('c.jpg')]
    fireEvent.change(screen.getByLabelText('写真を選択'), { target: { files: extra } })

    expect(onChange).toHaveBeenCalledWith([...photos, extra[0], extra[1]])
  })

  it('上限に達している状態では、選択欄が無効化され上限に達した旨のメッセージが表示されること', () => {
    const photos = Array.from({ length: 20 }, (_, i) => makePhoto(`p${i}.jpg`))
    render(<PhotoUploader photos={photos} onChange={vi.fn()} />)

    expect(screen.getByLabelText<HTMLInputElement>('写真を選択').disabled).toBe(true)
    expect(screen.getByText('上限の20枚に達しました。これ以上は追加できません。')).toBeTruthy()
  })
})
