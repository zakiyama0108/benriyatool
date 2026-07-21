'use client'

import { useState } from 'react'
import type { ScenarioRecord } from '../lib/types'

type Props = {
  scenarios: ScenarioRecord[]
  onSave: (name: string) => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}

function formatSavedAt(createdAt: string): string {
  const d = new Date(createdAt)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

// ログイン中のみ表示するマイシナリオの保存・一覧・読み込み・削除操作
// (仕様: design.md#マイシナリオ操作の表示を出し分ける処理、design.md#名前を付けて保存する処理、design.md#一覧を組み立てる処理)
export default function ScenarioPanel({ scenarios, onSave, onLoad, onDelete }: Props) {
  const [name, setName] = useState('')

  return (
    <div className="space-y-3 rounded-[18px] bg-lms-card p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
      <p className="text-sm font-bold text-lms-ink">マイシナリオ</p>

      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="シナリオ名"
          className="flex-1 rounded-full border border-lms-line bg-white px-3 py-1.5 text-sm text-lms-ink"
        />
        <button
          onClick={() => name.trim() && onSave(name)}
          disabled={!name.trim()}
          className="rounded-full bg-lms-teal px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          保存する
        </button>
      </div>

      {scenarios.length === 0 ? (
        <p className="text-sm text-lms-muted">保存されたシナリオはありません</p>
      ) : (
        <ul className="space-y-2">
          {scenarios.map((scenario) => (
            <li key={scenario.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
              <div>
                <p className="font-medium text-lms-ink">{scenario.name}</p>
                <p className="text-xs text-lms-muted">{formatSavedAt(scenario.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onLoad(scenario.id)} className="rounded-full border border-lms-line-strong px-3 py-1 text-xs">
                  読み込む
                </button>
                <button onClick={() => onDelete(scenario.id)} className="rounded-full border border-lms-coral px-3 py-1 text-xs text-lms-coral">
                  削除する
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
