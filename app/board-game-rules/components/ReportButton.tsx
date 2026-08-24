'use client'

import { useState } from 'react'
import { createReport } from '../lib/reports'

type Props = {
  gameId: string
}

// 理由テキストの文字数上限(report/design.md「通報を送信する処理」補足。lib/reports側のDB検証と揃える)
const MAX_REASON_LENGTH = 1000

// 通報導線+通報フォーム(仕様: report/design.md「画面設計」「状態管理」)。
// 「閉じている」「フォーム表示中」「送信中」「送信完了」の4状態を持つ。ログインの有無で出し分けはしない
// (誰でも通報できる)。理由は任意入力(空でも送信可)。送信完了後は再送フォームを出さず、
// 同一ゲームへの短時間の連投を簡易に抑える(report/design.md「ボット対策・濫用防止」)。
export default function ReportButton({ gameId }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)

  async function handleSend() {
    if (sending) return
    setSending(true)
    setFailed(false)
    const ok = await createReport(gameId, reason)
    setSending(false)
    if (ok) {
      setDone(true)
      setOpen(false)
      return
    }
    // 失敗時はフォームを開いたまま失敗表示し、再送できるようにする(design.md#エラーハンドリング)
    setFailed(true)
  }

  if (done) {
    return <p className="text-xs text-bgr-subtext">通報を送信しました。ご協力ありがとうございます。</p>
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-bgr-subtext underline hover:text-bgr-accent"
      >
        通報する
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <textarea
        value={reason}
        maxLength={MAX_REASON_LENGTH}
        onChange={(e) => setReason(e.target.value)}
        placeholder="通報の理由・補足(任意)"
        className="w-full rounded-lg border border-bgr-line bg-bgr-bg p-2 text-sm"
        rows={3}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={sending}
          onClick={() => void handleSend()}
          className="rounded-full border border-bgr-line bg-bgr-accent px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          送信
        </button>
        <button
          type="button"
          disabled={sending}
          onClick={() => setOpen(false)}
          className="rounded-full border border-bgr-line px-3 py-1.5 text-xs text-bgr-subtext disabled:opacity-50"
        >
          キャンセル
        </button>
      </div>
      {failed && <p className="text-xs text-bgr-accent">送信に失敗しました。時間をおいて再度お試しください。</p>}
    </div>
  )
}
