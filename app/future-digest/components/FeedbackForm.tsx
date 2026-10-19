'use client'

import { useState } from 'react'
import { saveFeedback } from '../lib/saveFeedback'

type Props = {
  articleId: string
  predictionId: string
}

type Status = 'idle' | 'sending' | 'sent' | 'failed'

const MAX_LENGTH = 1000

// 運営者向けフィードバックの自由記述入力欄(仕様: requirements.md#運営者向けフィードバック-11〜13、
// design.md「フィードバックを送信する処理」)。入力・送信状態は予測をまたいで共有しない
// (design.md「状態管理」)
export default function FeedbackForm({ articleId, predictionId }: Props) {
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const trimmedLength = comment.trim().length
  // 空・空白文字だけ、または1000字を超える場合は送信できない(requirements.md#運営者向け
  // フィードバック-13)
  const isSendable = trimmedLength > 0 && comment.length <= MAX_LENGTH && status !== 'sending'

  async function handleSubmit() {
    setStatus('sending')
    const succeeded = await saveFeedback({ articleId, predictionId, comment: comment.trim() })
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
        maxLength={MAX_LENGTH}
        placeholder="選定基準へのフィードバックを入力"
        className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-indigo-400"
        rows={2}
      />
      <div className="flex items-center justify-between text-[11px] text-gray-400">
        <span>
          {comment.length}/{MAX_LENGTH}字
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!isSendable}
          className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
        >
          送信
        </button>
        {status === 'sent' && <span className="text-xs text-indigo-600">送信しました</span>}
        {status === 'failed' && <span className="text-xs text-red-600">送信に失敗しました。もう一度お試しください</span>}
      </div>
    </div>
  )
}
