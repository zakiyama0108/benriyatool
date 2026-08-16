'use client'

import Link from 'next/link'
import type { Game } from '../lib/games'
import FavoriteButton from './FavoriteButton'

type Props = {
  game: Game
  // 画面内のお気に入り集合(まとめて1回取得したgame_id集合)から渡す登録済みフラグ
  // (design.md「状態管理」。favorites/page.tsxの一覧項目と同じ考え方)
  favorited: boolean
  onToggleFavorite?: (gameId: string, favorited: boolean) => void
}

// 一覧の1件カード(仕様: requirements.md#一覧表示-1、#一覧表示-2、#一覧表示-4)。
// ゲーム名・対応人数・プレイ時間・ジャンルを表示し、ゲーム名から詳細画面へ遷移できる。
// お気に入り操作(FavoriteButton)は未ログイン時に自身の内部判定で非表示になるため、
// ここではログイン状態を意識せず常に描画する(favorites/page.tsxの一覧項目と同じ構成)
export default function GameCard({ game, favorited, onToggleFavorite }: Props) {
  return (
    <li className="relative flex flex-col overflow-hidden rounded-2xl border border-bgr-line bg-bgr-card">
      <div className="absolute right-2 top-2 z-10">
        <FavoriteButton gameId={game.id} initialFavorited={favorited} onToggle={onToggleFavorite} />
      </div>
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
