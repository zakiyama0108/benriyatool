'use client'

import { useState } from 'react'
import type { GameRequest } from '../lib/gameRequests'
import type { PhotoFetchResult } from '../lib/photos'

type Props = {
  requests: GameRequest[]
  onMarkProcessed: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onViewPhotos: (photoPaths: string[]) => Promise<PhotoFetchResult[]>
}

// 登録依頼一覧(未処理優先・次いで新しい順。並びは呼び出し元が渡す時点で確定済み)。
// 写真プレビュー(オンデマンド取得)・入力済み分類情報を表示し、処理済みマーク・削除の導線を出す
// (仕様: admin/design.md「登録依頼を確認する処理」「登録依頼を処理済みにする処理/削除する処理」)
export default function GameRequestsView({ requests, onMarkProcessed, onDelete, onViewPhotos }: Props) {
  const [photosByRequestId, setPhotosByRequestId] = useState<Record<string, PhotoFetchResult[]>>({})
  // 処理済みマーク・削除・写真取得の処理中はボタンを無効化し二重実行を防ぐ(design.md「エラーハンドリング」)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleViewPhotos(request: GameRequest) {
    setBusyId(request.id)
    try {
      const photos = await onViewPhotos(request.photoPaths)
      setPhotosByRequestId((prev) => ({ ...prev, [request.id]: photos }))
    } finally {
      setBusyId(null)
    }
  }

  async function handleMarkProcessed(id: string) {
    setBusyId(id)
    try {
      await onMarkProcessed(id)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id)
    try {
      await onDelete(id)
    } finally {
      setBusyId(null)
    }
  }

  if (requests.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">登録依頼はありません。</p>
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div key={request.id} className="rounded-lg border border-gray-200 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{request.name || 'ゲーム名未入力'}</span>
            <span
              className={
                request.processedAt
                  ? 'rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'
                  : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700'
              }
            >
              {request.processedAt ? '処理済み' : '未処理'}
            </span>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            {request.minPlayers ?? '?'}〜{request.maxPlayers ?? '?'}人 / {request.minMinutes ?? '?'}〜
            {request.maxMinutes ?? '?'}分 / {request.genres.join('、') || 'ジャンル未選択'}
          </p>

          <div className="mt-2 flex flex-wrap gap-2">
            {!request.processedAt && (
              <button
                type="button"
                disabled={busyId === request.id}
                onClick={() => void handleMarkProcessed(request.id)}
                className="rounded border border-gray-300 px-3 py-1 text-xs disabled:opacity-40"
              >
                処理済みにする
              </button>
            )}
            <button
              type="button"
              disabled={busyId === request.id}
              onClick={() => void handleDelete(request.id)}
              className="rounded border border-gray-300 px-3 py-1 text-xs disabled:opacity-40"
            >
              削除
            </button>
            <button
              type="button"
              disabled={busyId === request.id}
              onClick={() => void handleViewPhotos(request)}
              className="rounded border border-gray-300 px-3 py-1 text-xs disabled:opacity-40"
            >
              写真を確認
            </button>
          </div>

          {photosByRequestId[request.id] && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photosByRequestId[request.id].map((photo) =>
                photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 非公開Storageの署名付きURLをそのまま表示する
                  <img
                    key={photo.path}
                    src={photo.url}
                    alt="依頼された元写真"
                    className="h-20 w-20 rounded border border-gray-200 object-cover"
                  />
                ) : (
                  <span key={photo.path} className="text-xs text-gray-400">
                    (取得失敗: {photo.path})
                  </span>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
