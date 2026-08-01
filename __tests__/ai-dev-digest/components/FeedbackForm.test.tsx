import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import FeedbackForm from '../../../app/ai-dev-digest/components/FeedbackForm'

const { saveFeedbackMock } = vi.hoisted(() => ({ saveFeedbackMock: vi.fn() }))
vi.mock('../../../app/ai-dev-digest/lib/saveFeedback', () => ({ saveFeedback: saveFeedbackMock }))

beforeEach(() => {
  saveFeedbackMock.mockReset()
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#運営者向けフィードバック-4、specs/ai-dev-digest/article-detail/requirements.md#運営者向けフィードバック-7、specs/ai-dev-digest/article-detail/requirements.md#運営者向けフィードバック-8、specs/ai-dev-digest/article-detail/design.md#フィードバックを送信する処理
describe('フィードバック入力欄 - 自由記述のコメントを入力・送信し、結果を画面に表示する', () => {
  it('入力欄が空文字のとき、送信ボタンが無効化されていること', () => {
    render(<FeedbackForm articleDate="2026-08-01" topicId="topic-1" />)
    const button = screen.getByRole('button', { name: '送信' })
    expect(button.disabled).toBe(true)
  })

  it('入力欄が空白文字のみのとき、送信ボタンが無効化されていること', () => {
    render(<FeedbackForm articleDate="2026-08-01" topicId="topic-1" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })
    const button = screen.getByRole('button', { name: '送信' })
    expect(button.disabled).toBe(true)
  })

  it('送信に成功した場合、入力欄が空になり「送信しました」と表示されること', async () => {
    saveFeedbackMock.mockResolvedValue(true)
    render(<FeedbackForm articleDate="2026-08-01" topicId="topic-1" />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'この選定はもう不要かもしれません' } })
    fireEvent.click(screen.getByRole('button', { name: '送信' }))

    await waitFor(() => expect(screen.getByText('送信しました')).toBeTruthy())
    expect(textarea.value).toBe('')
    expect(saveFeedbackMock).toHaveBeenCalledWith({
      articleDate: '2026-08-01',
      topicId: 'topic-1',
      comment: 'この選定はもう不要かもしれません',
    })
  })

  it('送信に失敗した場合、入力内容が残り「送信に失敗しました。もう一度お試しください」と表示されること', async () => {
    saveFeedbackMock.mockResolvedValue(false)
    render(<FeedbackForm articleDate="2026-08-01" topicId="topic-1" />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: '保存に失敗するはずの入力' } })
    fireEvent.click(screen.getByRole('button', { name: '送信' }))

    await waitFor(() => expect(screen.getByText('送信に失敗しました。もう一度お試しください')).toBeTruthy())
    expect(textarea.value).toBe('保存に失敗するはずの入力')
  })
})
