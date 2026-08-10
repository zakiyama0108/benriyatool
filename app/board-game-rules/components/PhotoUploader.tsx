'use client'

import { useEffect, useMemo, useRef } from 'react'

type Props = {
  photos: File[]
  onChange: (photos: File[]) => void
}

// 匿名アップロードの量的制約(admin/design.md「元写真の非公開Storage」)のうち、枚数上限はStorage側の
// RLSでは担保できないため画面側で制限する。ルールブックは表紙・目次・各ページで数十枚に及びうる一方、
// 際限のない選択・送信を防ぐため20枚を上限とする。
const MAX_PHOTO_COUNT = 20

// ルールブックの写真を複数枚選択・プレビュー・削除する(仕様: game-registration/requirements.md#写真のアップロード-1、
// design.md「依頼を送信する処理」手順1)。写真は本コンポーネントでは保持せず、親(register/page.tsx)が
// 状態として持つ制御コンポーネント。選択のたびに既存の選択済み写真へ追加する(累積、選び直しではない)。
export default function PhotoUploader({ photos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const atLimit = photos.length >= MAX_PHOTO_COUNT

  // プレビュー用のURLはphotosが変わるたびに作り直し、前回分はGC漏れを防ぐため後始末する
  const previewUrls = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos])
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  // 上限を超えた分は切り捨てて追加する(クリック選択・ドラッグ&ドロップ共通の処理)
  function addFiles(files: File[]) {
    if (files.length === 0 || atLimit) return
    const accepted = files.slice(0, Math.max(MAX_PHOTO_COUNT - photos.length, 0))
    if (accepted.length > 0) {
      onChange([...photos, ...accepted])
    }
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []))
    // 同じファイルを続けて選び直せるよう、選択後は入力をリセットする
    if (inputRef.current) inputRef.current.value = ''
  }

  // design.md「表示項目・操作」のドラッグ&ドロップ+クリック選択(見た目・操作の作り替えのためTDD対象外。tasks.md T6-1)
  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    addFiles(Array.from(e.dataTransfer.files ?? []))
  }

  function handleRemove(index: number) {
    onChange(photos.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="board-game-photo-input"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-bgr-line bg-bgr-bg px-4 py-8 text-center text-sm text-bgr-subtext"
      >
        <span className="font-medium text-bgr-heading">クリックまたはドラッグ&ドロップで写真を選択</span>
        <span className="text-xs">表紙・目次・各ページなど、複数枚可・最低1枚</span>
      </label>
      <input
        id="board-game-photo-input"
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={atLimit}
        onChange={handleSelect}
        aria-label="写真を選択"
        className="sr-only"
      />
      <p className="text-xs text-bgr-subtext">
        {photos.length}/{MAX_PHOTO_COUNT}枚
      </p>
      {atLimit && (
        <p className="text-xs text-bgr-accent">上限の{MAX_PHOTO_COUNT}枚に達しました。これ以上は追加できません。</p>
      )}
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {photos.map((photo, index) => (
            <li key={`${photo.name}-${index}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- 選択直後のFileをそのままプレビューするためobject URLを使う(next/imageは不要) */}
              <img
                src={previewUrls[index]}
                alt={`アップロード予定の写真 ${index + 1}枚目`}
                className="h-24 w-24 rounded-lg border border-bgr-line object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={`${index + 1}枚目の写真を削除`}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-bgr-heading text-xs text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
