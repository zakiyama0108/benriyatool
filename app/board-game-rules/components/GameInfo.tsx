import type { Game } from '../lib/games'

type Props = {
  game: Game
}

// 数値範囲を「3〜4」「4」のように表示する(下限=上限のときは1つだけ)
function rangeText(min: number, max: number): string {
  return min === max ? `${min}` : `${min}〜${max}`
}

// 分類情報の表示(仕様: game-detail/design.md「分類情報を表示する処理」)。
// 必須項目(ゲーム名・対応人数・プレイ時間)は常に表示し、空欄(未登録)の任意項目は
// その項目自体を出さない(「未登録」ラベルも出さない)。発売年は「年」を付けて表示する。
// 値はReactの既定エスケープで描画する(HTMLとして解釈しない。design.md#セキュリティ)。
export default function GameInfo({ game }: Props) {
  // 登録済みの任意項目だけをチップとして並べる(未登録は push しない=非表示)
  const items: { label: string; value: string }[] = [
    { label: '対応人数', value: `${rangeText(game.minPlayers, game.maxPlayers)}人` },
    { label: 'プレイ時間', value: `${rangeText(game.minMinutes, game.maxMinutes)}分` },
  ]
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
