'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Game } from '../lib/games'
import { getGamePhotoUrl } from '../lib/gamePhotos'
import FavoriteButton from './FavoriteButton'

type Props = {
  game: Game
  // 画面内のお気に入り集合(まとめて1回取得したgame_id集合)から渡す登録済みフラグ
  // (design.md「状態管理」。favorites/page.tsxの一覧項目と同じ考え方)
  favorited: boolean
  onToggleFavorite?: (gameId: string, favorited: boolean) => void
}

// メイン画像未登録・読み込み失敗時のプレースホルダー(仕様: requirements.md#画像表示-13、
// design.md「メイン画像を表示する処理」補足)。表示崩れを防ぐため、画像と同じ縦横比の
// 領域を確保する(bgr-bg背景+汎用モチーフのミープルシルエット)
function GamePhotoPlaceholder() {
  return (
    <div
      role="img"
      aria-label="メイン画像未登録"
      className="flex aspect-[4/3] w-full items-center justify-center bg-bgr-bg"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-10 w-10 fill-bgr-line">
        <path d="M12 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm-4.5 6h9a1 1 0 0 1 1 1v.7c0 .4-.2.7-.6.9L15 13.4V19a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-5.6l-1.9-.8a1 1 0 0 1-.6-.9V11a1 1 0 0 1 1-1Z" />
      </svg>
    </div>
  )
}

// 一覧の1件カード(仕様: requirements.md#一覧表示-1、#一覧表示-2、#一覧表示-4、#画像表示-12、#画像表示-13)。
// ゲーム名・対応人数・プレイ時間・ジャンル・メイン画像(またはプレースホルダー)を表示し、
// ゲーム名から詳細画面へ遷移できる。お気に入り操作(FavoriteButton)は未ログイン時に
// 自身の内部判定で非表示になるため、ここではログイン状態を意識せず常に描画する
// (favorites/page.tsxの一覧項目と同じ構成)
export default function GameCard({ game, favorited, onToggleFavorite }: Props) {
  // メイン画像の読み込みエラー(リンク切れ等)が起きたカードだけプレースホルダーへ切り替える
  // (design.md「エラーハンドリング」。他のカード・一覧全体には影響しない)
  const [imageError, setImageError] = useState(false)
  const mainPhotoPath = game.introPhotoPaths[0]
  const showImage = mainPhotoPath != null && !imageError

  return (
    <li className="relative flex flex-col overflow-hidden rounded-2xl border border-bgr-line bg-bgr-card">
      <div className="absolute right-2 top-2 z-10">
        <FavoriteButton gameId={game.id} initialFavorited={favorited} onToggle={onToggleFavorite} />
      </div>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- 公開Storageの外部URLをそのまま表示する(next/image最適化は不要)
        <img
          src={getGamePhotoUrl(mainPhotoPath)}
          alt={`${game.name}のメイン画像`}
          onError={() => setImageError(true)}
          className="aspect-[4/3] w-full object-cover"
        />
      ) : (
        <GamePhotoPlaceholder />
      )}
      <div className="flex flex-1 flex-col p-4">
        <Link
          href={`/board-game-rules/detail?id=${game.id}`}
          className="font-heading text-base font-bold text-bgr-heading after:absolute after:inset-0 after:content-['']"
        >
          {game.name}
        </Link>
        <div className="mt-2 space-y-1 text-xs text-bgr-subtext">
          <p>
            {game.minPlayers}〜{game.maxPlayers}人
          </p>
          <p>
            {game.minMinutes}〜{game.maxMinutes}分
          </p>
        </div>
        {game.genres.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {game.genres.map((genre) => (
              <span key={genre} className="rounded border border-bgr-line bg-bgr-bg px-2 py-1 text-xs text-bgr-subtext">
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  )
}
