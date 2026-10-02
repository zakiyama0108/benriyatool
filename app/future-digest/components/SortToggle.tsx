'use client'

import type { SortOrder } from '../lib/sortSlots'

type Props = {
  order: SortOrder
  onChange: (order: SortOrder) => void
}

// 影響度順・ジャンル順の切り替えボタン(仕様: requirements.md#並び順の切り替え-7、
// requirements.md#並び順の切り替え-10)。選択中のものはaria-pressedで示す
export default function SortToggle({ order, onChange }: Props) {
  return (
    <div className="flex gap-2" role="group" aria-label="並び順">
      <button
        type="button"
        aria-pressed={order === 'impact'}
        onClick={() => onChange('impact')}
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          order === 'impact' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        影響度順
      </button>
      <button
        type="button"
        aria-pressed={order === 'genre'}
        onClick={() => onChange('genre')}
        className={`rounded-full px-3 py-1 text-xs font-bold ${
          order === 'genre' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        ジャンル順
      </button>
    </div>
  )
}
