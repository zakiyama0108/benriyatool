'use client'
import { useEffect, useState } from 'react'
import { USAGE_BANNER_STEPS } from '../lib/usageGuideContent'
import { loadUsageBannerOpen, saveUsageBannerOpen } from '../lib/usageBannerStorage'

// 画面上部(タイトル直下)に置く、操作の流れを案内する折りたたみ式バナー。
// 初回描画はサーバー側と一致させるため開いた状態を初期値とし、マウント後に
// ブラウザの保存値があれば読み込んで反映する(仕様: design.md#使い方バナーの開閉状態を初期化・保存する処理-1、-2)
export default function UsageBanner() {
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    // サーバー側の初回描画(開いた状態)とブラウザの保存値が異なりうるため、意図的に
    // マウント後の1回だけ読み込み直して反映する(design.md#使い方バナーの開閉状態を
    // 初期化・保存する処理。一瞬開いて見えるちらつきは同処理内で許容すると明記済み)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(loadUsageBannerOpen())
  }, [])

  function toggle() {
    const next = !isOpen
    setIsOpen(next)
    saveUsageBannerOpen(next)
  }

  return (
    <div className="rounded-[18px] bg-lms-teal-soft p-4">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between text-left text-sm font-bold text-lms-ink"
      >
        <span>使い方: 3ステップで将来の資産を見通せます</span>
        <span aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <ol className="mt-3 space-y-2">
          {USAGE_BANNER_STEPS.map((step) => (
            <li key={step.title} className="text-xs text-lms-muted">
              <p className="font-semibold text-lms-ink">{step.title}</p>
              <p className="mt-0.5">{step.text}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
