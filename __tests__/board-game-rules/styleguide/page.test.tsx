import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import StyleguidePage from '../../../app/board-game-rules/styleguide/page'

// styleguideページはchrome(BoardGameNav)・FavoriteButton・LoginStatusなどsession依存の共通部品を
// 並べる。これらが内部で参照するセッション取得・認証操作をモックする(supabaseClientの環境変数チェックを
// 避けるため。register/page.test.tsx と同じ方針)。未ログイン状態で描画する
vi.mock('../../../app/board-game-rules/lib/useSession', () => ({
  useSession: () => ({ session: null, loading: false }),
}))
vi.mock('../../../app/lib/adminAuth', () => ({ signInWithGoogle: vi.fn(), signOut: vi.fn() }))
// FavoriteButtonが読み込むfavorites.tsは共通supabaseClient(環境変数チェック)をimportするため、
// テストではモックしてクライアント初期化を回避する(register/page.test.tsxのgameRequestsモックと同方針)
vi.mock('../../../app/board-game-rules/lib/favorites', () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}))

beforeEach(() => {
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() })
})

// 仕様: specs/board-game-rules/design-system/requirements.md#共通部品カタログstyleguideページ-4
describe('【styleguide】デザイントークン見本 - 配色・フォント・角丸をカタログとして一覧できる', () => {
  it('Analog Hearthの配色8トークンのスウォッチ(トークン名と16進値)が並ぶこと', () => {
    render(<StyleguidePage />)
    const tokens = [
      'bgr-bg',
      'bgr-card',
      'bgr-line',
      'bgr-heading',
      'bgr-subtext',
      'bgr-primary',
      'bgr-primary-active',
      'bgr-accent',
    ]
    for (const token of tokens) {
      expect(screen.getByText(token)).toBeTruthy()
    }
    // 実体(globals.css)の16進値も添える(DESIGN.mdから転記した代表値で確認)
    expect(screen.getByText('#F7F3EA')).toBeTruthy()
    expect(screen.getByText('#B96B3E')).toBeTruthy()
  })

  it('見出しフォント・本文フォントの見本が表示されること', () => {
    render(<StyleguidePage />)
    expect(screen.getByText('見出しフォント')).toBeTruthy()
    expect(screen.getByText('本文フォント')).toBeTruthy()
  })

  it('角丸3段階(8px/16px/4px)の見本が表示されること', () => {
    render(<StyleguidePage />)
    expect(screen.getByText('8px')).toBeTruthy()
    expect(screen.getByText('16px')).toBeTruthy()
    expect(screen.getByText('4px')).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/design-system/requirements.md#共通部品カタログstyleguideページ-4
describe('【styleguide】共通chrome - 左サイドバー共通ナビをそのまま載せる', () => {
  it('共通ナビ(BoardGameNav)が表示され、登録依頼・お気に入りのリンクを持つこと', () => {
    render(<StyleguidePage />)
    const nav = screen.getByRole('navigation', { name: '共通ナビ' })
    expect(within(nav).getByRole('link', { name: /登録依頼/ })).toBeTruthy()
    expect(within(nav).getByRole('link', { name: /お気に入り/ }).getAttribute('href')).toBe(
      '/board-game-rules/favorites'
    )
  })
})

// 仕様: specs/board-game-rules/design-system/requirements.md#共通部品カタログstyleguideページ-4
describe('【styleguide】共通部品カタログ - ボタン・カード・パンくずの見本が並ぶ', () => {
  it('主要ボタン(有効)と無効ボタンの見本が表示されること', () => {
    render(<StyleguidePage />)
    expect(screen.getByRole('button', { name: '主要ボタン' }).hasAttribute('disabled')).toBe(false)
    expect(screen.getByRole('button', { name: '無効ボタン' }).hasAttribute('disabled')).toBe(true)
  })

  it('カード見本とパンくず見本が表示されること', () => {
    render(<StyleguidePage />)
    expect(screen.getByText('カード見本')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'パンくず(見本)' })).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/design-system/requirements.md#共通部品カタログstyleguideページ-4
describe('【styleguide】フォーム部品 - PhotoUploaderを実部品として動く状態で載せる', () => {
  it('写真アップローダーが表示され、写真を選ぶと枚数表示が0/20枚から1/20枚に増えること', () => {
    render(<StyleguidePage />)
    expect(screen.getByText('0/20枚')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('写真を選択'), {
      target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] },
    })
    expect(screen.getByText('1/20枚')).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/design-system/requirements.md#共通部品カタログstyleguideページ-4
describe('【styleguide】session依存部品 - 実部品(未ログイン)とレプリカを使い分けて状態を見せる', () => {
  it('お気に入りトグルは未ログインでは実部品が何も表示せず、未登録・登録済みのレプリカで両状態を見せること', () => {
    render(<StyleguidePage />)
    // 実部品(未ログイン)はnullを返すため、実部品由来の「お気に入り」ボタンは存在しない
    expect(screen.queryByRole('button', { name: 'お気に入り' })).toBeNull()
    // 代わりに未登録・登録済みの静的レプリカで両状態を見せる
    expect(screen.getByText('未登録')).toBeTruthy()
    expect(screen.getByText('登録済み')).toBeTruthy()
  })

  it('ログイン導線は未ログインの実部品(ログインボタン)と、ログイン中のレプリカ(ログアウト)を並べること', () => {
    render(<StyleguidePage />)
    expect(screen.getByRole('button', { name: 'Googleでログイン' })).toBeTruthy()
    expect(screen.getByText('ログアウト')).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/design-system/requirements.md#共通部品カタログstyleguideページ-5
describe('【styleguide】キャプチャ用の目印 - ページ内に「styleguide」の文字列を持つ', () => {
  it('見出しに「styleguide」を含むこと(styleguide.pngキャプチャのwait-for用)', () => {
    render(<StyleguidePage />)
    expect(screen.getByRole('heading', { name: /styleguide/i })).toBeTruthy()
  })
})
