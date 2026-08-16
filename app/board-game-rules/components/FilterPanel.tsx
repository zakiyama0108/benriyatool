'use client'

import { useState } from 'react'
import { EMPTY_FILTERS, type FilterOptions, type GameFilters, type PlaytimeBand } from '../lib/filterGames'
import type { Genre } from '../lib/genres'

type Props = {
  options: FilterOptions
  filters: GameFilters
  onChange: (filters: GameFilters) => void
}

// 絞り込み条件を1項目だけ更新して即座に親へ通知する(design.md「Stitchの生成結果のうち…
// 採用しない」で「検索する」ボタンを設けない方針にしたため、送信操作を挟まない。requirements.md#絞り込み-9)
function update<K extends keyof GameFilters>(
  filters: GameFilters,
  onChange: (filters: GameFilters) => void,
  key: K,
  value: GameFilters[K]
) {
  onChange({ ...filters, [key]: value })
}

const SELECT_CLASS =
  'rounded-lg border border-bgr-line bg-bgr-bg px-3 py-2 text-sm text-bgr-heading focus:border-bgr-primary focus:outline-none'
const LABEL_CLASS = 'block text-xs font-medium text-bgr-subtext'

// 「絞り込み条件を開く」アイコン(スライダー意匠の自前SVG。他アイコンと同様プロジェクト内で完結させる)
function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
      <path d="M4 6h16v2H4V6Zm3 5h10v2H7v-2Zm3 5h4v2h-4v-2Z" />
    </svg>
  )
}

// 絞り込みパネル(仕様: requirements.md#絞り込み、design.md「画面構成」)。8分類のドロップダウン
// (単一選択)+作者のテキスト検索+リセットで構成する。作者テキスト検索欄だけは常時表示し、
// 残り8分類+リセットはTailwindの`hidden`ユーティリティクラス(`className`経由)でモバイル時の
// 初期状態を閉じ、`md:flex`が画面幅md以上でこのクラスを上書きして常時表示にする
// (`hidden md:flex`は本プロジェクトの他コンポーネント(BoardGameNav等)でも使う定番パターン)。
// ネイティブHTMLの`hidden`属性は使わない: Tailwind v4のPreflightが`[hidden]`セレクタへ
// `display: none !important`を再宣言しており(`!important`同士の比較ではlayerの前後関係が
// 反転するため、`md:flex`側に`!`修飾子を足しても後発のutilitiesレイヤーは勝てない)、
// 属性ベースだとmd以上でも`hidden`が`md:flex`を上書きし続け、デスクトップで一切開けなくなる
export default function FilterPanel({ options, filters, onChange }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  function findPlaytimeBand(label: string): PlaytimeBand | null {
    return options.playtimeBands.find((band) => band.label === label) ?? null
  }

  return (
    <div className="rounded-2xl border border-bgr-line bg-bgr-card p-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          aria-label="作者で検索"
          placeholder="作者名で検索(部分一致)"
          value={filters.authorQuery}
          onChange={(e) => update(filters, onChange, 'authorQuery', e.target.value)}
          className={`${SELECT_CLASS} flex-1`}
        />
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="filter-options-panel"
          aria-label="絞り込み条件を開閉する"
          onClick={() => setMobileOpen((open) => !open)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-bgr-line bg-bgr-bg text-bgr-heading md:hidden"
        >
          <FilterIcon />
        </button>
      </div>

      <div
        id="filter-options-panel"
        className={`mt-3 space-y-3 md:flex md:flex-wrap md:items-end md:gap-3 md:space-y-0 ${
          mobileOpen ? '' : 'hidden'
        }`}
      >
        <div className="space-y-1">
          <label htmlFor="filter-player-count" className={LABEL_CLASS}>
            対応人数
          </label>
          <select
            id="filter-player-count"
            value={filters.playerCount ?? ''}
            onChange={(e) =>
              update(filters, onChange, 'playerCount', e.target.value === '' ? null : Number(e.target.value))
            }
            className={SELECT_CLASS}
          >
            <option value="">指定なし</option>
            {options.playerCounts.map((n) => (
              <option key={n} value={n}>
                {n}人
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-playtime" className={LABEL_CLASS}>
            プレイ時間
          </label>
          <select
            id="filter-playtime"
            value={filters.playtimeBand?.label ?? ''}
            onChange={(e) =>
              update(filters, onChange, 'playtimeBand', e.target.value === '' ? null : findPlaytimeBand(e.target.value))
            }
            className={SELECT_CLASS}
          >
            <option value="">指定なし</option>
            {options.playtimeBands.map((band) => (
              <option key={band.label} value={band.label}>
                {band.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-genre" className={LABEL_CLASS}>
            ジャンル
          </label>
          <select
            id="filter-genre"
            value={filters.genre ?? ''}
            onChange={(e) => update(filters, onChange, 'genre', e.target.value === '' ? null : (e.target.value as Genre))}
            className={SELECT_CLASS}
          >
            <option value="">指定なし</option>
            {options.genres.map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-min-age" className={LABEL_CLASS}>
            対象年齢
          </label>
          <select
            id="filter-min-age"
            value={filters.minAge ?? ''}
            onChange={(e) =>
              update(filters, onChange, 'minAge', e.target.value === '' ? null : Number(e.target.value))
            }
            className={SELECT_CLASS}
          >
            <option value="">指定なし</option>
            {options.minAges.map((age) => (
              <option key={age} value={age}>
                {age}歳以上
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-difficulty" className={LABEL_CLASS}>
            難易度
          </label>
          <select
            id="filter-difficulty"
            value={filters.difficulty ?? ''}
            onChange={(e) => update(filters, onChange, 'difficulty', e.target.value === '' ? null : e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">指定なし</option>
            {options.difficulties.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-publisher" className={LABEL_CLASS}>
            メーカー/出版社
          </label>
          <select
            id="filter-publisher"
            value={filters.publisher ?? ''}
            onChange={(e) => update(filters, onChange, 'publisher', e.target.value === '' ? null : e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">指定なし</option>
            {options.publishers.map((publisher) => (
              <option key={publisher} value={publisher}>
                {publisher}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-japanese-rules" className={LABEL_CLASS}>
            言語依存度(日本語ルール)
          </label>
          <select
            id="filter-japanese-rules"
            value={filters.hasJapaneseRules == null ? '' : String(filters.hasJapaneseRules)}
            onChange={(e) =>
              update(filters, onChange, 'hasJapaneseRules', e.target.value === '' ? null : e.target.value === 'true')
            }
            className={SELECT_CLASS}
          >
            <option value="">指定なし</option>
            <option value="true">日本語ルールあり</option>
            <option value="false">日本語ルールなし</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="filter-awards" className={LABEL_CLASS}>
            受賞歴
          </label>
          <select
            id="filter-awards"
            value={filters.awardsOnly ? 'only' : ''}
            onChange={(e) => update(filters, onChange, 'awardsOnly', e.target.value === 'only')}
            className={SELECT_CLASS}
          >
            <option value="">指定なし</option>
            <option value="only">受賞歴あり(該当のみ)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="rounded-lg border border-bgr-line bg-bgr-bg px-4 py-2 text-sm font-medium text-bgr-heading transition-colors hover:bg-bgr-line/40"
        >
          リセット
        </button>
      </div>
    </div>
  )
}
