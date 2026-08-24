import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PhotoGallery from '../../../app/board-game-rules/components/PhotoGallery'
import { getGamePhotoUrl } from '../../../app/board-game-rules/lib/gamePhotos'

// 公開URL変換はlib/gamePhotosの共有ヘルパーから来るためモックする
vi.mock('../../../app/board-game-rules/lib/gamePhotos', () => ({
  getGamePhotoUrl: vi.fn((path: string) => `https://cdn.example/${path}`),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#画像表示-9
describe('ゲーム紹介画像ギャラリー - 1枚以上あれば登録順に表示する', () => {
  it('intro_photo_pathsの各パスが公開URLへ変換され、登録順どおりに画像として表示されること', () => {
    render(<PhotoGallery paths={['g/0.jpg', 'g/1.jpg']} />)

    expect(getGamePhotoUrl).toHaveBeenCalledWith('g/0.jpg')
    expect(getGamePhotoUrl).toHaveBeenCalledWith('g/1.jpg')
    const images = screen.getAllByRole('img')
    expect(images.map((img) => img.getAttribute('src'))).toEqual([
      'https://cdn.example/g/0.jpg',
      'https://cdn.example/g/1.jpg',
    ])
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#画像表示-9
describe('ゲーム紹介画像ギャラリー - 0枚のときはギャラリー自体を表示しない', () => {
  it('paths が空配列のとき、何も描画しない(領域を空けたままにしない)こと', () => {
    const { container } = render(<PhotoGallery paths={[]} />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('img')).toBeNull()
  })
})
