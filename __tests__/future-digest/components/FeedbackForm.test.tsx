import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import FeedbackForm from '../../../app/future-digest/components/FeedbackForm'

const { saveFeedbackMock } = vi.hoisted(() => ({ saveFeedbackMock: vi.fn() }))
vi.mock('../../../app/future-digest/lib/saveFeedback', () => ({ saveFeedback: saveFeedbackMock }))

beforeEach(() => {
  saveFeedbackMock.mockReset()
})

// 仕様: specs/future-digest/article-detail/requirements.md#運営者向けフィードバック-13
describe('フィードバック入力欄 - 空・空白のみ・1000字超の入力では送信できないようにする', () => {
  it('入力欄が空文字のとき、送信ボタンが無効化されていること', () => {
    render(<FeedbackForm articleId="2026-09-24" predictionId="technology-ai--near" />)
    expect((screen.getByRole('button', { name: '送信' })).disabled).toBe(true)
  })

  it('入力欄が空白文字のみのとき、送信ボタンが無効化されていること', () => {
    render(<FeedbackForm articleId="2026-09-24" predictionId="technology-ai--near" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    expect((screen.getByRole('button', { name: '送信' })).disabled).toBe(true)
  })

  it('入力欄にmaxLength={1000}が設定されていること', () => {
    render(<FeedbackForm articleId="2026-09-24" predictionId="technology-ai--near" />)
    expect(screen.getByRole('textbox').getAttribute('maxlength')).toBe('1000')
  })

  it('1000字ちょうどの入力では送信ボタンが有効なこと', () => {
    render(<FeedbackForm articleId="2026-09-24" predictionId="technology-ai--near" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'あ'.repeat(1000) } })
    expect((screen.getByRole('button', { name: '送信' })).disabled).toBe(false)
  })
})

// 仕様: specs/future-digest/article-detail/requirements.md#運営者向けフィードバック-12、specs/future-digest/article-detail/requirements.md#運営者向けフィードバック-13
describe('フィードバック入力欄 - 送信・結果表示', () => {
  it('送信中はボタンが無効化されること', async () => {
    let resolveSave: (value: boolean) => void = () => {}
    saveFeedbackMock.mockReturnValue(new Promise<boolean>((resolve) => { resolveSave = resolve }))
    render(<FeedbackForm articleId="2026-09-24" predictionId="technology-ai--near" />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'この選定はもう不要かもしれません' } })
    fireEvent.click(screen.getByRole('button', { name: '送信' }))

    await waitFor(() => expect((screen.getByRole('button', { name: '送信' })).disabled).toBe(true))
    resolveSave(true)
  })

  it('送信に成功した場合、入力欄が空になり「送信しました」と表示されること', async () => {
    saveFeedbackMock.mockResolvedValue(true)
    render(<FeedbackForm articleId="2026-09-24" predictionId="technology-ai--near" />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'この選定はもう不要かもしれません' } })
    fireEvent.click(screen.getByRole('button', { name: '送信' }))

    await waitFor(() => expect(screen.getByText('送信しました')).toBeTruthy())
    expect(textarea.value).toBe('')
    expect(saveFeedbackMock).toHaveBeenCalledWith({
      articleId: '2026-09-24',
      predictionId: 'technology-ai--near',
      comment: 'この選定はもう不要かもしれません',
    })
  })

  it('送信に失敗した場合、入力内容が残り「送信に失敗しました。もう一度お試しください」と表示されること', async () => {
    saveFeedbackMock.mockResolvedValue(false)
    render(<FeedbackForm articleId="2026-09-24" predictionId="technology-ai--near" />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: '保存に失敗するはずの入力' } })
    fireEvent.click(screen.getByRole('button', { name: '送信' }))

    await waitFor(() => expect(screen.getByText('送信に失敗しました。もう一度お試しください')).toBeTruthy())
    expect(textarea.value).toBe('保存に失敗するはずの入力')
  })
})
