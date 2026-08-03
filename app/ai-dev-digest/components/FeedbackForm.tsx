'use client'

import { useState } from 'react'
import { saveFeedback } from '../lib/saveFeedback'

type Props = {
  articleDate: string
  topicId: string
}

type Status = 'idle' | 'sending' | 'sent' | 'failed'

// 運営者向けフィードバックの自由記述入力欄(仕様: requirements.md#運営者向けフィードバック-5、
// requirements.md#運営者向けフィードバック-7〜9、design.md「フィードバックを送信する処理」)。
// 入力・送信状態はトピックをまたいで共有しない(design.md「状態管理」)
export default function FeedbackForm({ articleDate, topicId }: Props) {
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  // 空文字・空白文字のみの入力は送信できない(requirements.md#運営者向けフィードバック-9)
  const isSendable = comment.trim().length > 0 && status !== 'sending'

  async function handleSubmit() {
    setStatus('sending')
    const succeeded = await saveFeedback({ articleDate, topicId, comment: comment.trim() })
    if (succeeded) {
      setComment('')
      setStatus('sent')
    } else {
      // 失敗時は入力内容を残す(自由記述が消えたことに気づけない不親切さを避けるため)
      setStatus('failed')
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="選定基準へのフィードバックを入力"
        className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-teal-400"
        rows={2}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!isSendable}
          className="rounded-full bg-teal-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
        >
          送信
        </button>
        {status === 'sent' && <span className="text-xs text-teal-600">送信しました</span>}
        {status === 'failed' && <span className="text-xs text-red-600">送信に失敗しました。もう一度お試しください</span>}
      </div>
    </div>
  )
}
