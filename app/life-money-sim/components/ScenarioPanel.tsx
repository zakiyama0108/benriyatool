'use client'

import { useState } from 'react'
import type { ScenarioRecord } from '../lib/types'

type Props = {
  scenarios: ScenarioRecord[]
  onSave: (name: string) => Promise<boolean>
  onLoad: (id: string) => void
  onDelete: (id: string) => Promise<boolean>
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

// 同日に複数保存した場合でも区別できるよう、時刻(時:分)まで表示する
function formatSavedAt(createdAt: string): string {
  const d = new Date(createdAt)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`
}

// ログイン中のみ表示するマイシナリオの保存・一覧・読み込み・削除操作。
// 保存・削除は処理中に再押下できないようにし、失敗時は失敗が分かる表示にする
// (仕様: design.md#マイシナリオ操作の表示を出し分ける処理、design.md#名前を付けて保存する処理、
//  design.md#一覧を組み立てる処理、design.md#削除する処理、design.md#エラーハンドリング)
export default function ScenarioPanel({ scenarios, onSave, onLoad, onDelete }: Props) {
  const [name, setName] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteFailedId, setDeleteFailedId] = useState<string | null>(null)

  async function handleSaveClick() {
    if (!name.trim() || saveStatus === 'saving') return
    setSaveStatus('saving')
    const ok = await onSave(name)
    if (ok) {
      setName('')
      setSaveStatus('saved')
    } else {
      setSaveStatus('error')
    }
  }

  async function handleDeleteClick(id: string) {
    if (deletingId) return
    setDeletingId(id)
    setDeleteFailedId(null)
    const ok = await onDelete(id)
    setDeletingId(null)
    if (!ok) setDeleteFailedId(id)
  }

  return (
    <div className="space-y-3 rounded-[18px] bg-lms-card p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
      <p className="text-sm font-bold text-lms-ink">マイシナリオ</p>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaveStatus('idle')
          }}
          placeholder="シナリオ名"
          className="flex-1 rounded-full border border-lms-line bg-white px-3 py-1.5 text-sm text-lms-ink"
        />
        <button
          onClick={() => void handleSaveClick()}
          disabled={!name.trim() || saveStatus === 'saving'}
          className="rounded-full bg-lms-teal px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {saveStatus === 'saving' ? '保存中…' : '保存する'}
        </button>
      </div>
      {saveStatus === 'saved' && <p className="text-xs text-lms-teal">保存しました</p>}
      {saveStatus === 'error' && <p className="text-xs text-lms-coral">保存に失敗しました</p>}

      {scenarios.length === 0 ? (
        <p className="text-sm text-lms-muted">保存されたシナリオはありません</p>
      ) : (
        <ul className="space-y-2">
          {scenarios.map((scenario) => {
            const isDeleting = deletingId === scenario.id
            return (
              <li key={scenario.id} className="rounded-xl bg-white px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-lms-ink">{scenario.name}</p>
                    <p className="text-xs text-lms-muted">{formatSavedAt(scenario.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onLoad(scenario.id)}
                      disabled={isDeleting}
                      className="rounded-full border border-lms-line-strong px-3 py-1 text-xs disabled:opacity-40"
                    >
                      読み込む
                    </button>
                    <button
                      onClick={() => void handleDeleteClick(scenario.id)}
                      disabled={isDeleting}
                      className="rounded-full border border-lms-coral px-3 py-1 text-xs text-lms-coral disabled:opacity-40"
                    >
                      {isDeleting ? '削除中…' : '削除する'}
                    </button>
                  </div>
                </div>
                {deleteFailedId === scenario.id && <p className="mt-1 text-xs text-lms-coral">削除に失敗しました</p>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
