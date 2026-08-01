'use client'
import { useState } from 'react'
import { GLOSSARY_TERMS } from '../lib/usageGuideContent'

// 資産推移グラフ・テーブルのカード付近に置く「用語集」ボタンと、本ツール特有の用語一覧を
// 表示するモーダル。開閉状態はこのコンポーネント内で完結するローカル状態とする
// (仕様: design.md#用語集モーダルを開閉する処理、design.md#状態管理)
export default function GlossaryButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full bg-lms-teal-soft px-3 py-1 text-xs font-bold text-lms-teal hover:bg-lms-teal/20"
      >
        用語集
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-label="用語集"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-[18px] bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-lms-ink">用語集</p>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full px-2 py-1 text-xs text-lms-muted hover:bg-lms-canvas"
              >
                閉じる
              </button>
            </div>
            <dl className="mt-3 space-y-3">
              {GLOSSARY_TERMS.map((entry) => (
                <div key={entry.term}>
                  <dt className="text-sm font-bold text-lms-ink">{entry.term}</dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-lms-muted">{entry.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </>
  )
}
