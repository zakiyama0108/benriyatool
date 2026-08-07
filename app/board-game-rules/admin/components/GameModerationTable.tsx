'use client'

import { useState } from 'react'
import type { AdminGame } from '../lib/fetchAdminGames'
import type { PhotoFetchResult } from '../lib/photos'

type Props = {
  games: AdminGame[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewPhotos: (photoPaths: string[]) => Promise<PhotoFetchResult[]>
}

// ゲーム一覧(通報件数の多い順・次いで新しい順。並びは呼び出し元が渡す時点で確定済み)。
// 削除済みは区別して表示し、行ごとに編集・削除(確認ステップ付き)・元写真の照合閲覧の導線を出す
// (仕様: admin/design.md「ゲーム一覧を取得する処理」「ゲームを削除する処理」「元写真を照合閲覧する処理」)
export default function GameModerationTable({ games, onEdit, onDelete, onViewPhotos }: Props) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [photosByGameId, setPhotosByGameId] = useState<Record<string, PhotoFetchResult[]>>({})

  async function handleViewPhotos(game: AdminGame) {
    const photos = await onViewPhotos(game.photoPaths)
    setPhotosByGameId((prev) => ({ ...prev, [game.id]: photos }))
  }

  if (games.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">登録されているゲームはありません。</p>
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <div key={game.id} className="rounded-lg border border-gray-200 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{game.name}</span>
            {game.deletedAt && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">削除済み</span>
            )}
            <span className="ml-auto text-xs text-gray-500">
              通報 <span>{game.reportCount}</span>
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onEdit(game.id)}
              className="rounded border border-gray-300 px-3 py-1 text-xs"
            >
              編集
            </button>
            <button
              type="button"
              onClick={() => setConfirmingId(game.id)}
              className="rounded border border-gray-300 px-3 py-1 text-xs"
            >
              削除
            </button>
            <button
              type="button"
              onClick={() => void handleViewPhotos(game)}
              className="rounded border border-gray-300 px-3 py-1 text-xs"
            >
              元写真を確認
            </button>
          </div>

          {confirmingId === game.id && (
            <div className="mt-2 flex items-center gap-2 rounded bg-red-50 p-2 text-xs text-red-700">
              <span>本当に削除しますか?</span>
              <button
                type="button"
                onClick={() => {
                  setConfirmingId(null)
                  onDelete(game.id)
                }}
                className="rounded bg-red-600 px-2 py-1 text-white"
              >
                削除を確定
              </button>
              <button
                type="button"
                onClick={() => setConfirmingId(null)}
                className="rounded border border-gray-300 px-2 py-1 text-gray-700"
              >
                キャンセル
              </button>
            </div>
          )}

          {photosByGameId[game.id] && (
            <div className="mt-2 flex flex-wrap gap-2">
              {photosByGameId[game.id].map((photo) =>
                photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 非公開Storageの署名付きURLをそのまま表示する
                  <img
                    key={photo.path}
                    src={photo.url}
                    alt="投稿された元写真"
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
