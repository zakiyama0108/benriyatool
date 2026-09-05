import type { Game } from '../lib/games'
import { formatRange } from '../lib/gameDisplay'

type Props = {
  game: Game
}

// 分類情報の表示(仕様: game-detail/design.md「分類情報を表示する処理」)。
// 必須項目はゲーム名のみで、常に表示する。対応人数・プレイ時間を含む他の項目は
// 空欄(未登録)なら、その項目自体を出さない(「未登録」ラベルも出さない。
// 対応人数・プレイ時間は根拠が得られた場合のみ埋まるため常に値がある保証はない。
// admin/requirements.md#登録実行のローカル処理起動-13)。発売年は「年」を付けて表示する。
// 値はReactの既定エスケープで描画する(HTMLとして解釈しない。design.md#セキュリティ)。
export default function GameInfo({ game }: Props) {
  // 登録済みの任意項目だけをチップとして並べる(未登録は push しない=非表示)
  const items: { label: string; value: string }[] = []
  const playersText = formatRange(game.minPlayers, game.maxPlayers)
  if (playersText) items.push({ label: '対応人数', value: `${playersText}人` })
  const minutesText = formatRange(game.minMinutes, game.maxMinutes)
  if (minutesText) items.push({ label: 'プレイ時間', value: `${minutesText}分` })
  if (game.genres.length > 0) items.push({ label: 'ジャンル', value: game.genres.join('・') })
  if (game.minAge != null) items.push({ label: '対象年齢', value: `${game.minAge}歳以上` })
  if (game.difficulty) items.push({ label: '難易度', value: game.difficulty })
  if (game.publisher) items.push({ label: 'メーカー/出版社', value: game.publisher })
  if (game.author) items.push({ label: '作者', value: game.author })
  if (game.hasJapaneseRules != null) {
    items.push({ label: '日本語ルール', value: game.hasJapaneseRules ? 'あり' : 'なし' })
  }
  if (game.awards) items.push({ label: '受賞歴', value: game.awards })
  if (game.releaseYear != null) items.push({ label: '発売年', value: `${game.releaseYear}年` })

  return (
    <div>
      <h1 className="text-2xl font-bold text-bgr-text">{game.name}</h1>
      <dl className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="inline-flex items-baseline gap-1 rounded-full border border-bgr-line bg-bgr-bg px-3 py-1 text-sm"
          >
            <dt className="text-xs text-bgr-subtext">{item.label}</dt>
            <dd className="font-medium text-bgr-text">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
