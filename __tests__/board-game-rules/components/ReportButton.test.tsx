import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ReportButton from '../../../app/board-game-rules/components/ReportButton'
import { createReport } from '../../../app/board-game-rules/lib/reports'

// 送信のDB操作はlib/reportsから来るためモックし、「4状態の遷移と送信呼び出し」を検証する
vi.mock('../../../app/board-game-rules/lib/reports', () => ({ createReport: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createReport).mockResolvedValue(true)
})

// 仕様: specs/board-game-rules/report/requirements.md#通報の送信-1
describe('通報導線 - 初期は控えめな「通報する」導線のみで、押すと通報フォームが開く', () => {
  it('初期表示では「通報する」導線が出て、理由入力フォームは開いていないこと', () => {
    render(<ReportButton gameId="game-1" />)

    expect(screen.getByRole('button', { name: '通報する' })).toBeTruthy()
    expect(screen.queryByPlaceholderText(/理由/)).toBeNull()
  })

  it('「通報する」を押すと、理由の入力欄と送信ボタンが表示されること', () => {
    render(<ReportButton gameId="game-1" />)
    fireEvent.click(screen.getByRole('button', { name: '通報する' }))

    expect(screen.getByPlaceholderText(/理由/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '送信' })).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/report/requirements.md#通報の送信-3、specs/board-game-rules/report/requirements.md#通報の送信-4
describe('通報の送信 - 理由は任意入力(空でも送信可)で、送信すると完了表示になる', () => {
  it('理由を未入力のまま送信でき、createReportが空理由で呼ばれ、完了表示になること', async () => {
    render(<ReportButton gameId="game-1" />)
    fireEvent.click(screen.getByRole('button', { name: '通報する' }))
    fireEvent.click(screen.getByRole('button', { name: '送信' }))

    expect(createReport).toHaveBeenCalledWith('game-1', '')
    await waitFor(() => expect(screen.getByText(/送信しました|完了|受け付け/)).toBeTruthy())
  })

  it('理由を入力して送信すると、その理由でcreateReportが呼ばれること', async () => {
    render(<ReportButton gameId="game-1" />)
    fireEvent.click(screen.getByRole('button', { name: '通報する' }))
    fireEvent.change(screen.getByPlaceholderText(/理由/), { target: { value: 'ルールに誤りがあります' } })
    fireEvent.click(screen.getByRole('button', { name: '送信' }))

    expect(createReport).toHaveBeenCalledWith('game-1', 'ルールに誤りがあります')
    await waitFor(() => expect(screen.getByText(/送信しました|完了|受け付け/)).toBeTruthy())
  })

  it('送信が完了したら、同一ゲームへの再送信フォーム(送信ボタン)は出ないこと(短時間の連投を簡易に抑える)', async () => {
    render(<ReportButton gameId="game-1" />)
    fireEvent.click(screen.getByRole('button', { name: '通報する' }))
    fireEvent.click(screen.getByRole('button', { name: '送信' }))

    await waitFor(() => expect(screen.getByText(/送信しました|完了|受け付け/)).toBeTruthy())
    expect(screen.queryByRole('button', { name: '送信' })).toBeNull()
  })
})

// 仕様: specs/board-game-rules/report/design.md#エラーハンドリング
describe('通報の送信 - 送信中は二重送信を防ぎ、失敗時は失敗表示のうえ再送できる', () => {
  it('送信中は送信ボタンが無効化され、二重送信を防ぐこと', async () => {
    let resolveSend: (value: boolean) => void = () => {}
    vi.mocked(createReport).mockReturnValue(new Promise((resolve) => (resolveSend = resolve)))

    render(<ReportButton gameId="game-1" />)
    fireEvent.click(screen.getByRole('button', { name: '通報する' }))
    fireEvent.click(screen.getByRole('button', { name: '送信' }))

    expect((screen.getByRole('button', { name: '送信' }) as HTMLButtonElement).disabled).toBe(true)

    resolveSend(true)
    await waitFor(() => expect(screen.getByText(/送信しました|完了|受け付け/)).toBeTruthy())
  })

  it('送信に失敗した場合、失敗が分かる表示が出て、送信ボタンが再び押せる(再送できる)こと', async () => {
    vi.mocked(createReport).mockResolvedValue(false)

    render(<ReportButton gameId="game-1" />)
    fireEvent.click(screen.getByRole('button', { name: '通報する' }))
    fireEvent.click(screen.getByRole('button', { name: '送信' }))

    await waitFor(() => expect(screen.getByText(/失敗/)).toBeTruthy())
    expect((screen.getByRole('button', { name: '送信' }) as HTMLButtonElement).disabled).toBe(false)
  })
})
