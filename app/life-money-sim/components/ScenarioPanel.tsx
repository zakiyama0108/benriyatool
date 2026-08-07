'use client'

import { useState } from 'react'
import type { ScenarioRecord } from '../lib/types'

type Props = {
  scenarios: ScenarioRecord[]
  // 自動読み込み・一覧からの読み込みで画面へ反映された、上書き更新の対象となるシナリオ
  // (仕様: requirements.md#上書き保存-10。呼び出し元(page.tsx)がIDを管理し、該当レコードを渡す)
  activeScenario: ScenarioRecord | null
  onSave: (name: string) => Promise<boolean>
  onLoad: (id: string) => void
  onDelete: (id: string) => Promise<boolean>
}

type SaveMessage = 'none' | 'saved' | 'error'

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
export default function ScenarioPanel({ scenarios, activeScenario, onSave, onLoad, onDelete }: Props) {
  const [name, setName] = useState(activeScenario?.name ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<SaveMessage>('none')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteFailedId, setDeleteFailedId] = useState<string | null>(null)

  // アクティブなシナリオが切り替わった(読み込み直後・保存直後に別IDになった)タイミングでのみ、
  // 名前欄をそのシナリオの名前に合わせる。編集中に他の理由で再描画されても上書きしない
  // (仕様: requirements.md#上書き保存-11。エフェクトではなくレンダー中の同期にすることで、
  //  余計な再レンダーを避ける公式パターンに従う: https://react.dev/learn/you-might-not-need-an-effect)
  const [syncedScenarioId, setSyncedScenarioId] = useState(activeScenario?.id ?? null)
  if ((activeScenario?.id ?? null) !== syncedScenarioId) {
    setSyncedScenarioId(activeScenario?.id ?? null)
    setName(activeScenario?.name ?? '')
  }

  // 名前欄がアクティブなシナリオの名前のままなら上書き更新、それ以外(未変更の対象がない・名前を変更した)は
  // 新規保存として扱う(仕様: requirements.md#上書き保存-12〜14)
  const isUpdateMode = activeScenario !== null && name === activeScenario.name

  // isSavingを表示用メッセージ(saveMessage)と別状態にする。入力欄も保存中は無効化するため、
  // 通信中に名前を書き換えて二重INSERT/UPDATEになることはない(design.md#エラーハンドリング)
  async function handleSaveClick() {
    if (!name.trim() || isSaving) return
    if (isUpdateMode) {
      // 上書き更新の前に対象シナリオ名を含む確認ダイアログを表示し、キャンセル時は何も送信しない
      // (仕様: requirements.md#上書き保存-12)
      const confirmed = window.confirm(`「${activeScenario.name}」を更新します。よろしいですか?`)
      if (!confirmed) return
    }
    setIsSaving(true)
    setSaveMessage('none')
    const ok = await onSave(name)
    setIsSaving(false)
    if (ok) {
      setSaveMessage('saved')
    } else {
      setSaveMessage('error')
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
    <div className="space-y-3 rounded-[35px] border border-lms-line-strong bg-lms-card p-5">
      <p className="text-sm font-bold text-lms-ink">マイシナリオ</p>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSaveMessage('none')
          }}
          disabled={isSaving}
          placeholder="シナリオ名"
          className="flex-1 rounded-full border border-lms-line-strong bg-white px-3 py-1.5 text-sm text-lms-ink outline-none focus:border-lms-sand-ink focus:bg-lms-sand-soft/40 disabled:opacity-40"
        />
        <button
          onClick={() => void handleSaveClick()}
          disabled={!name.trim() || isSaving}
          className="rounded-full bg-lms-teal px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {/* アクティブなシナリオがあり名前欄がそのシナリオの名前のままなら「更新する」と表示する
              (仕様: requirements.md#上書き保存-11、design.md#画面設計) */}
          {isSaving ? (isUpdateMode ? '更新中…' : '保存中…') : isUpdateMode ? '更新する' : '保存する'}
        </button>
      </div>
      {saveMessage === 'saved' && <p className="text-xs text-lms-teal">保存しました</p>}
      {saveMessage === 'error' && <p className="text-xs text-lms-coral">保存に失敗しました</p>}

      {scenarios.length === 0 ? (
        <p className="text-sm text-lms-muted">保存されたシナリオはありません</p>
      ) : (
        <ul className="space-y-2">
          {scenarios.map((scenario) => {
            const isDeleting = deletingId === scenario.id
            // 他の行が削除処理中の間も、押しても無視されるだけの状態にせず見た目上も無効化して揃える
            const isBusy = deletingId !== null
            // この行が上の名前欄・保存ボタンの対象(アクティブなシナリオ)かどうかを見た目で区別する
            // (仕様: requirements.md#上書き保存-16。同名の別シナリオとの混同を防ぐ)
            const isActive = activeScenario !== null && scenario.id === activeScenario.id
            return (
              <li
                key={scenario.id}
                className={`rounded-xl px-3 py-2 text-sm ${
                  isActive ? 'border border-lms-teal bg-lms-teal/10' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-lms-ink">
                      {scenario.name}
                      {isActive && (
                        <span className="ml-2 rounded-full bg-lms-teal px-2 py-0.5 text-xs font-normal text-white">
                          編集中
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-lms-muted">{formatSavedAt(scenario.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onLoad(scenario.id)}
                      disabled={isBusy}
                      className="rounded-full border border-lms-line-strong px-3 py-1 text-xs disabled:opacity-40"
                    >
                      読み込む
                    </button>
                    <button
                      onClick={() => void handleDeleteClick(scenario.id)}
                      disabled={isBusy}
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
