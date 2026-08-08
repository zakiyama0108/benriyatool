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

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) {
      const accepted = files.slice(0, Math.max(MAX_PHOTO_COUNT - photos.length, 0))
      if (accepted.length > 0) {
        onChange([...photos, ...accepted])
      }
    }
    // 同じファイルを続けて選び直せるよう、選択後は入力をリセットする
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleRemove(index: number) {
    onChange(photos.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <label htmlFor="board-game-photo-input" className="block text-sm font-medium text-gray-700">
        ルールブックの写真(表紙・目次・各ページなど、複数枚可・最低1枚)
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
        className="block text-sm text-gray-600"
      />
      <p className="text-xs text-gray-400">
        {photos.length}/{MAX_PHOTO_COUNT}枚
      </p>
      {atLimit && (
        <p className="text-xs text-amber-600">上限の{MAX_PHOTO_COUNT}枚に達しました。これ以上は追加できません。</p>
      )}
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {photos.map((photo, index) => (
            <li key={`${photo.name}-${index}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- 選択直後のFileをそのままプレビューするためobject URLを使う(next/imageは不要) */}
              <img
                src={previewUrls[index]}
                alt={`アップロード予定の写真 ${index + 1}枚目`}
                className="h-24 w-24 rounded-lg border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={`${index + 1}枚目の写真を削除`}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white"
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
