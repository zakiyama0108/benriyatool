import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import FeedbackForm from '../../../app/research-digest/components/FeedbackForm'

const { saveFeedbackMock } = vi.hoisted(() => ({ saveFeedbackMock: vi.fn() }))
vi.mock('../../../app/research-digest/lib/saveFeedback', () => ({ saveFeedback: saveFeedbackMock }))

beforeEach(() => {
  saveFeedbackMock.mockReset()
})

const textbox = () => screen.getByRole<HTMLTextAreaElement>('textbox')
const sendButton = () => screen.getByRole<HTMLButtonElement>('button', { name: '送信' })

// 仕様: specs/research-digest/article-detail/requirements.md#運営者向けフィードバック-13
describe('フィードバック入力欄 - 空・空白のみ・1000字超の入力では送信できないようにする', () => {
  it('入力欄が空のとき、送信ボタンが押せないこと', () => {
    render(<FeedbackForm articleId="2026-10-05" findingId="medical-health" />)
    expect(sendButton().disabled).toBe(true)
  })

  it('入力欄が空白文字だけのとき、送信ボタンが押せないこと', () => {
    render(<FeedbackForm articleId="2026-10-05" findingId="medical-health" />)
    fireEvent.change(textbox(), { target: { value: '   ' } })
    expect(sendButton().disabled).toBe(true)
  })

  it('入力欄の文字数の上限が1000字に設定されていること', () => {
    render(<FeedbackForm articleId="2026-10-05" findingId="medical-health" />)
    expect(textbox().getAttribute('maxlength')).toBe('1000')
  })

  it('1000字ちょうどの入力では送信ボタンが押せて、残り字数が表示されること', () => {
    render(<FeedbackForm articleId="2026-10-05" findingId="medical-health" />)
    fireEvent.change(textbox(), { target: { value: 'あ'.repeat(1000) } })
    expect(sendButton().disabled).toBe(false)
    expect(screen.getByText('1000/1000字')).toBeTruthy()
  })

  it('1000字を超える入力(貼り付けなどで上限を越えた場合)では送信ボタンが押せないこと', () => {
    render(<FeedbackForm articleId="2026-10-05" findingId="medical-health" />)
    fireEvent.change(textbox(), { target: { value: 'あ'.repeat(1001) } })
    expect(sendButton().disabled).toBe(true)
  })
})

// 仕様: specs/research-digest/article-detail/requirements.md#運営者向けフィードバック-12、specs/research-digest/article-detail/requirements.md#運営者向けフィードバック-13
describe('フィードバック入力欄 - 送信・結果表示', () => {
  it('送信中は送信ボタンが押せなくなること(二重送信の防止)', async () => {
    let resolveSave: (value: boolean) => void = () => {}
    saveFeedbackMock.mockReturnValue(new Promise<boolean>((resolve) => { resolveSave = resolve }))
    render(<FeedbackForm articleId="2026-10-05" findingId="medical-health" />)

    fireEvent.change(textbox(), { target: { value: 'この選定は良かったです' } })
    fireEvent.click(sendButton())

    await waitFor(() => expect(sendButton().disabled).toBe(true))
    resolveSave(true)
  })

  it('送信に成功した場合、入力欄が空になり「送信しました」と表示され、記事と研究に紐づけて保存されること', async () => {
    saveFeedbackMock.mockResolvedValue(true)
    render(<FeedbackForm articleId="2026-10-05" findingId="medical-health" />)

    fireEvent.change(textbox(), { target: { value: ' この選定は良かったです ' } })
    fireEvent.click(sendButton())

    await waitFor(() => expect(screen.getByText('送信しました')).toBeTruthy())
    expect(textbox().value).toBe('')
    expect(saveFeedbackMock).toHaveBeenCalledWith({
      articleId: '2026-10-05',
      findingId: 'medical-health',
      comment: 'この選定は良かったです',
    })
  })

  it('送信に失敗した場合、入力内容が残り「送信に失敗しました。もう一度お試しください」と表示されること', async () => {
    saveFeedbackMock.mockResolvedValue(false)
    render(<FeedbackForm articleId="2026-10-05" findingId="medical-health" />)

    fireEvent.change(textbox(), { target: { value: '保存に失敗するはずの入力' } })
    fireEvent.click(sendButton())

    await waitFor(() => expect(screen.getByText('送信に失敗しました。もう一度お試しください')).toBeTruthy())
    expect(textbox().value).toBe('保存に失敗するはずの入力')
  })
})
