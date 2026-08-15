import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RegisterPage from '../../../app/board-game-rules/register/page'
import { createGameRequest } from '../../../app/board-game-rules/lib/gameRequests'

vi.mock('../../../app/board-game-rules/lib/gameRequests', () => ({
  createGameRequest: vi.fn(),
}))

// ヘッダーのLoginStatusが内部で参照するセッション取得・認証操作をモックする(supabaseClientの
// 環境変数チェックを避けるため。LoginStatus.test.tsx と同じ方針)
vi.mock('../../../app/board-game-rules/lib/useSession', () => ({
  useSession: () => ({ session: null, loading: false }),
}))
vi.mock('../../../app/lib/adminAuth', () => ({ signInWithGoogle: vi.fn(), signOut: vi.fn() }))

function makePhoto(name = 'cover.jpg'): File {
  return new File(['dummy'], name, { type: 'image/jpeg' })
}

function selectPhoto(name?: string) {
  fireEvent.change(screen.getByLabelText('写真を選択'), { target: { files: [makePhoto(name)] } })
}

// ジャンル・メカニクスのアコーディオンを開く(T6-2で既定折りたたみになったため、
// ジャンルを選択する系のテストではこのヘルパーで先に開く)
function openGenreSection() {
  fireEvent.click(screen.getByRole('button', { name: 'ジャンル・メカニクス' }))
}

beforeEach(() => {
  vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock-url'), revokeObjectURL: vi.fn() })
  vi.mocked(createGameRequest).mockReset().mockResolvedValue(true)
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#写真のアップロード-1、specs/board-game-rules/game-registration/requirements.md#依頼の送信-5
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
    openGenreSection()
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

// 仕様: specs/board-game-rules/game-registration/requirements.md#写真のアップロード-2、specs/board-game-rules/game-registration/requirements.md#依頼の送信-6、specs/board-game-rules/game-registration/requirements.md#依頼の送信-7
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

// 仕様: specs/board-game-rules/game-registration/requirements.md#分類情報の任意入力-4
describe('【登録依頼画面】ジャンル選択のアコーディオン - 既定で折りたたみ、開閉操作で28種の選択肢の表示を切り替える', () => {
  it('初期表示ではジャンルの選択肢(チップ)が表示されないこと', () => {
    render(<RegisterPage />)
    expect(screen.queryByRole('checkbox', { name: '対戦' })).toBeNull()
  })

  it('見出しを押すとジャンルの選択肢が現れ、もう一度押すと隠れること(aria-expandedが開閉と連動する)', () => {
    render(<RegisterPage />)
    const toggle = screen.getByRole('button', { name: 'ジャンル・メカニクス' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('checkbox', { name: '対戦' })).toBeTruthy()

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('checkbox', { name: '対戦' })).toBeNull()
  })
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#分類情報の任意入力-4
describe('【登録依頼画面】ジャンルの説明文 - 選択したチップの直下にだけ表示する(情報過多を避けるため常時表示しない)', () => {
  it('ジャンルを何も選択していない間は、説明文がどれも表示されないこと', () => {
    render(<RegisterPage />)
    openGenreSection()

    expect(screen.queryByText('プレイヤー同士が競い合い、勝敗を決める')).toBeNull()
    expect(screen.queryByText('プレイヤー全員がチームとなり、共通の目標達成を目指す')).toBeNull()
  })

  it('「対戦」を選択すると、その直下に「対戦」の説明文だけが表示され、未選択の「協力」の説明文は表示されないこと', () => {
    render(<RegisterPage />)
    openGenreSection()
    fireEvent.click(screen.getByRole('checkbox', { name: '対戦' }))

    expect(screen.getByText('プレイヤー同士が競い合い、勝敗を決める')).toBeTruthy()
    expect(screen.queryByText('プレイヤー全員がチームとなり、共通の目標達成を目指す')).toBeNull()
  })
})

// 仕様: specs/board-game-rules/game-registration/design.md「ナビゲーション(左サイドバー共通ナビ)」
describe('【登録依頼画面】共通ナビ(左サイドバー) - お気に入り一覧画面と同じナビを表示し、登録依頼を現在地にする', () => {
  it('左サイドバーの共通ナビが表示され、登録依頼が現在地・お気に入りへのリンクを持つこと', () => {
    render(<RegisterPage />)
    const nav = screen.getByRole('navigation', { name: '共通ナビ' })
    const register = within(nav).getByRole('link', { name: /登録依頼/ })
    const favorites = within(nav).getByRole('link', { name: /お気に入り/ })

    expect(register.getAttribute('aria-current')).toBe('page')
    expect(favorites.getAttribute('href')).toBe('/board-game-rules/favorites')
  })
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#写真のアップロード-1、specs/board-game-rules/game-registration/requirements.md#分類情報の任意入力-3
describe('【登録依頼画面】レイアウト構成 - 写真セクションを最上部の必須項目として配置し、任意項目は「詳細情報」にまとめる', () => {
  it('写真セクションが「基本情報」より前(画面最上部)にあり、必須であることが分かる表示があること', () => {
    render(<RegisterPage />)
    const headingTexts = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    const photoIndex = headingTexts.indexOf('ルールブックの写真')
    const basicInfoIndex = headingTexts.indexOf('基本情報')

    expect(photoIndex).toBeGreaterThanOrEqual(0)
    expect(basicInfoIndex).toBeGreaterThan(photoIndex)
    expect(screen.getByText('必須')).toBeTruthy()
    expect(screen.getByText('0/20枚')).toBeTruthy()
  })

  it('対象年齢・難易度など任意項目が「詳細情報」の見出し配下にまとまっていること', () => {
    render(<RegisterPage />)
    const detailHeading = screen.getByRole('heading', { name: '詳細情報', level: 2 })
    const detailSection = detailHeading.closest('section')
    expect(detailSection).not.toBeNull()

    const detailScreen = within(detailSection as HTMLElement)
    expect(detailScreen.getByLabelText('対象年齢')).toBeTruthy()
    expect(detailScreen.getByLabelText('難易度')).toBeTruthy()
    expect(detailScreen.getByLabelText('メーカー/出版社')).toBeTruthy()
    expect(detailScreen.getByLabelText('作者')).toBeTruthy()
    expect(detailScreen.getByLabelText('言語依存度(日本語ルール)')).toBeTruthy()
    expect(detailScreen.getByLabelText('受賞歴')).toBeTruthy()
    expect(detailScreen.getByLabelText('発売年')).toBeTruthy()
  })
})
