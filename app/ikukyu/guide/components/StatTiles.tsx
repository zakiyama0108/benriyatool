import { GUIDE_THEMES, type GuideTheme } from '../lib/theme'

type Tile = {
  value: string
  label: string
}

type Props = {
  tiles: Tile[]
  theme: GuideTheme
}

// タイルの配色。1枚目は記事のテーマカラー、2枚目以降はローズ・アンバーで彩る
// (承認済みデザイン案Bのスタットタイル)
const SUB_TONES = ['bg-rose-50 text-rose-600', 'bg-amber-50 text-amber-600']

// 記事冒頭の要点スタットタイル。キー数値(80%・28日など)を一目で伝える
export default function StatTiles({ tiles, theme }: Props) {
  const t = GUIDE_THEMES[theme]
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className={`rounded-2xl px-2 py-3 text-center ${i === 0 ? t.accentSoftBg : SUB_TONES[(i - 1) % SUB_TONES.length]}`}
        >
          <div className="text-xl font-extrabold tracking-tight">{tile.value}</div>
          <div className="mt-0.5 text-[10px] leading-tight text-gray-500">{tile.label}</div>
        </div>
      ))}
    </div>
  )
}
