'use client'
import { useState } from 'react'
import type { SaveResultInput } from '../lib/types'
import { saveResult } from '../lib/saveResult'

type Props = {
  input: SaveResultInput
}

// 「この試算を保存する」ボタン。送信中は再押下できないようにし、保存完了を軽く伝える
// (仕様: design.md#試算結果を保存する処理、design.md#エラーハンドリング)
export default function SaveButton({ input }: Props) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function handleClick() {
    setStatus('saving')
    const succeeded = await saveResult(input)
    // 失敗時はエラーを画面に伝えず、何も表示しない状態(idle)に戻す(design.md#試算結果を保存する処理)
    setStatus(succeeded ? 'saved' : 'idle')
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={status === 'saving'}
        className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === 'saving' ? '保存中…' : 'この試算を保存する'}
      </button>
      {status === 'saved' && <span className="text-xs text-teal-700">保存しました</span>}
    </div>
  )
}
