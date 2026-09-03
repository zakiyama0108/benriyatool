'use client'

import { useState } from 'react'
import type { GameRequest, GameRequestStatus, RequestMutationResult } from '../lib/gameRequests'
import type { PhotoFetchResult } from '../lib/photos'
import { getGamePhotoUrl } from '../../lib/gamePhotos'
import DraftReviewCard from './DraftReviewCard'

type Props = {
  requests: GameRequest[]
  onDelete: (id: string) => Promise<void>
  onViewPhotos: (photoPaths: string[]) => Promise<PhotoFetchResult[]>
  // 登録実行・下書きレビューの操作(T2b。DraftReviewCardへ渡す)
  onTrigger: (id: string, currentStatus: GameRequestStatus) => Promise<RequestMutationResult>
  onPublish: (request: GameRequest) => Promise<RequestMutationResult>
  onRequestRevision: (
    id: string,
    note: string,
    currentStatus: GameRequestStatus
  ) => Promise<RequestMutationResult>
}

// 登録依頼一覧(未処理優先・次いで新しい順。並びは呼び出し元が渡す時点で確定済み)。
// 写真プレビュー(オンデマンド取得)・入力済み分類情報を表示し、削除の導線を出す。
// 処理済み/未処理バッジは publishDraft・registerGame.ts が自動でセットする processed_at をそのまま表示する
// (仕様: admin/design.md「登録依頼を確認する処理」「登録依頼を削除する処理」)
export default function GameRequestsView({
  requests,
  onDelete,
  onViewPhotos,
  onTrigger,
  onPublish,
  onRequestRevision,
}: Props) {
  const [photosByRequestId, setPhotosByRequestId] = useState<Record<string, PhotoFetchResult[]>>({})
  // 削除・写真取得の処理中はボタンを無効化し二重実行を防ぐ(design.md「エラーハンドリング」)
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

  async function handleDelete(id: string) {
    setBusyId(id)
    try {
      await onDelete(id)
    } finally {
      setBusyId(null)
    }
  }

  if (requests.length === 0) {
    return <p className="py-4 text-center text-sm text-bgr-subtext">登録依頼はありません。</p>
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div key={request.id} className="rounded-lg border border-bgr-line bg-bgr-card p-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-bgr-heading">{request.name || 'ゲーム名未入力'}</span>
            <span
              className={
                request.processedAt
                  ? 'rounded-full bg-bgr-bg px-2 py-0.5 text-xs text-bgr-subtext'
                  : 'rounded-full bg-bgr-accent/20 px-2 py-0.5 text-xs text-bgr-accent'
              }
            >
              {request.processedAt ? '処理済み' : '未処理'}
            </span>
          </div>

          <p className="mt-1 text-xs text-bgr-subtext">
            {request.minPlayers ?? '?'}〜{request.maxPlayers ?? '?'}人 / {request.minMinutes ?? '?'}〜
            {request.maxMinutes ?? '?'}分 / {request.genres.join('、') || 'ジャンル未選択'}
          </p>

          {request.introPhotoPaths.length > 0 ? (
            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                {request.introPhotoPaths.map((path, index) => (
                  // クリックで公開Storageの原寸画像を別タブ表示する(モーダルは作らず依存を増やさない)
                  <a
                    key={path}
                    href={getGamePhotoUrl(path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block cursor-pointer transition hover:opacity-80"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- 公開Storageの外部URLをそのまま表示する(next/image最適化は不要) */}
                    <img
                      src={getGamePhotoUrl(path)}
                      alt={`依頼されたゲーム紹介画像 ${index + 1}枚目`}
                      className="h-28 w-28 rounded border border-bgr-line object-cover"
                    />
                  </a>
                ))}
              </div>
              <p className="mt-1 text-xs text-bgr-subtext">クリックで原寸表示(別タブ)</p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-bgr-subtext">紹介画像なし(登録時に自動補完されます)</p>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busyId === request.id}
              onClick={() => void handleDelete(request.id)}
              className="rounded border border-bgr-line px-3 py-1 text-xs text-bgr-heading hover:bg-bgr-bg disabled:opacity-40"
            >
              削除
            </button>
            <button
              type="button"
              disabled={busyId === request.id}
              onClick={() => void handleViewPhotos(request)}
              className="rounded border border-bgr-line px-3 py-1 text-xs text-bgr-heading hover:bg-bgr-bg disabled:opacity-40"
            >
              写真を確認
            </button>
          </div>

          {photosByRequestId[request.id] && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                {photosByRequestId[request.id].map((photo) =>
                  photo.url ? (
                    // クリックで署名付きURLの原寸写真を別タブ表示する(モーダルは作らず依存を増やさない)
                    <a
                      key={photo.path}
                      href={photo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block cursor-pointer transition hover:opacity-80"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- 非公開Storageの署名付きURLをそのまま表示する */}
                      <img
                        src={photo.url}
                        alt="依頼された元写真"
                        className="h-28 w-28 rounded border border-bgr-line object-cover"
                      />
                    </a>
                  ) : (
                    <span key={photo.path} className="text-xs text-bgr-subtext">
                      (取得失敗: {photo.path})
                    </span>
                  )
                )}
              </div>
              {photosByRequestId[request.id].some((photo) => photo.url) && (
                <p className="mt-1 text-xs text-bgr-subtext">クリックで原寸表示(別タブ)</p>
              )}
            </div>
          )}

          <DraftReviewCard
            request={request}
            onTrigger={onTrigger}
            onPublish={onPublish}
            onRequestRevision={onRequestRevision}
          />
        </div>
      ))}
    </div>
  )
}
