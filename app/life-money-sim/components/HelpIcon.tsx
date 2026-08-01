'use client'
import { useEffect, useRef } from 'react'

type Props = {
  id: string
  text: string
  openId: string | null
  onToggle: (id: string) => void
  onClose: () => void
}

// カードタイトル横に表示する「？」アイコンとポップオーバー。開閉状態自体(openId)は
// 呼び出し元(page.tsx)が一元管理するため、本コンポーネントはクリックでのトグル要求(onToggle)と
// 外側クリックでのクローズ要求(onClose)を通知するだけの表示コンポーネントとする
// (仕様: design.md#コンテキストヘルプの開閉を制御する処理、design.md#コンポーネント設計)
export default function HelpIcon({ id, text, openId, onToggle, onClose }: Props) {
  const isOpen = openId === id
  const containerRef = useRef<HTMLDivElement>(null)

  // 開いているときだけ外側クリックを監視し、外側なら閉じる(仕様: requirements.md#コンテキストヘルプ(？アイコン)-2)
  useEffect(() => {
    if (!isOpen) return
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isOpen, onClose])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-label="ヘルプ"
        onClick={() => onToggle(id)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-lms-muted text-[11px] font-bold text-lms-muted outline-none hover:border-lms-teal hover:text-lms-teal"
      >
        ?
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-10 mt-2 w-64 max-w-[80vw] rounded-2xl border border-lms-line bg-lms-card p-3 text-xs leading-relaxed text-lms-ink shadow-lg">
          {text}
        </div>
      )}
    </div>
  )
}
