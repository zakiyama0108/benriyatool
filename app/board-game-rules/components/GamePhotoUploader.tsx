'use client'

import { useEffect, useMemo, useRef } from 'react'

type Props = {
  photos: File[]
  onChange: (photos: File[]) => void
}

// ルールブック写真(PhotoUploader)と同じ量的制約(20枚)。ゲーム紹介画像は別枠でカウントする
// (仕様: game-registration/requirements.md#ゲーム紹介画像のアップロード-9)。
const MAX_PHOTO_COUNT = 20

// ゲーム紹介画像の複数枚選択・プレビュー・削除・メイン画像指定(仕様: game-registration/requirements.md#ゲーム紹介画像のアップロード-9〜11、
// design.md「ゲーム紹介画像を選択・並び替える処理」)。ルールブック写真用のPhotoUploaderと選択・プレビュー・削除の
// 基本挙動は共通だが、本コンポーネントは任意項目(最低1枚の必須表示を持たない)であり、
// 加えて「メイン画像にする」操作(先頭へ移動)を持つ点が異なる。写真そのものはここでは保持せず、
// 親(register/page.tsx)が状態として持つ制御コンポーネント。
export default function GamePhotoUploader({ photos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const atLimit = photos.length >= MAX_PHOTO_COUNT

  // プレビュー用のURLはphotosが変わるたびに作り直し、前回分はGC漏れを防ぐため後始末する
  const previewUrls = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos])
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  // 上限を超えた分は切り捨てて追加する(クリック選択・ドラッグ&ドロップ共通の処理。PhotoUploaderと同じ挙動)
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

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    addFiles(Array.from(e.dataTransfer.files ?? []))
  }

  function handleRemove(index: number) {
    onChange(photos.filter((_, i) => i !== index))
  }

  // 指定した画像を選択済み画像の先頭へ移動する=メイン画像に指定する
  // (design.md「ゲーム紹介画像を選択・並び替える処理」手順2)。他の画像は選択順を保ったまま1つずつ後ろへずれる。
  // 任意の2枚の入れ替えのような汎用の並び替えは提供しない(design.mdの判断どおり「先頭へ移動」のみ)
  function handleSetMain(index: number) {
    if (index === 0) return
    const target = photos[index]
    const rest = photos.filter((_, i) => i !== index)
    onChange([target, ...rest])
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="board-game-intro-photo-input"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-bgr-line bg-bgr-bg px-4 py-6 text-center text-sm text-bgr-subtext"
      >
        <span className="font-medium text-bgr-heading">クリックまたはドラッグ&ドロップで画像を選択</span>
        <span className="text-xs">パッケージ・コンポーネント・プレイ風景などがあれば(任意)</span>
      </label>
      <input
        id="board-game-intro-photo-input"
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={atLimit}
        onChange={handleSelect}
        aria-label="ゲーム紹介画像を選択"
        className="sr-only"
      />
      <p className="text-xs text-bgr-subtext">
        {photos.length}/{MAX_PHOTO_COUNT}枚
      </p>
      {atLimit && (
        <p className="text-xs text-bgr-accent">上限の{MAX_PHOTO_COUNT}枚に達しました。これ以上は追加できません。</p>
      )}
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-3 pt-1">
          {photos.map((photo, index) => (
            <li key={`${photo.name}-${index}`} className="relative w-20">
              {index === 0 && (
                <span className="absolute left-1 top-1 z-10 rounded bg-bgr-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                  メイン
                </span>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element -- 選択直後のFileをそのままプレビューするためobject URLを使う(next/imageは不要) */}
              <img
                src={previewUrls[index]}
                alt={`ゲーム紹介画像 ${index + 1}枚目`}
                className="h-20 w-20 rounded border border-bgr-line object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={`ゲーム紹介画像 ${index + 1}枚目を削除`}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-bgr-heading text-xs text-white shadow"
              >
                ×
              </button>
              {index !== 0 && (
                <button
                  type="button"
                  onClick={() => handleSetMain(index)}
                  aria-label={`ゲーム紹介画像 ${index + 1}枚目をメイン画像にする`}
                  className="mt-1 w-full rounded border border-bgr-line px-1 py-0.5 text-[10px] text-bgr-subtext hover:border-bgr-primary"
                >
                  メイン画像にする
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
