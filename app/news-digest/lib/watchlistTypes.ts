// 情報源の固定リスト・採用基準の型定義(仕様: design.md「データ設計(情報源・採用基準)」)。
// 実データはcontent/news-digest/watchlist.json・criteria.jsonに置く(requirements.mdとの
// 二重管理。変更はmonthly-reviewの月次見直しのみで行う)

import type { Category } from './types'

// カテゴリ種別はarticle-detail等が使うCategory型(requirements.md#カテゴリ-1)と同一の値集合のため、
// 二重定義を避けてtypes.tsのCategoryをそのまま参照する
export type CategoryId = Category

export type WatchlistChannel =
  | { type: 'rss'; feedUrl: string }
  | { type: 'official-page'; url: string } // 公式RSSがない情報源(神奈川県公式サイトのお知らせ等)向け

export type WatchlistEntry = {
  id: string // 例: "nhk-news-web", "kanagawa-shimbun"
  category: CategoryId
  name: string // 例: "NHK NEWS WEB"
  channels: WatchlistChannel[]
}

export type Criteria = {
  weeklyTopicCountMax: Record<CategoryId, number> // requirements.md#1週あたりの掲載件数-6(general:3, business:2, kanagawa:1, childcare:1)
  minCorroboratingSources: number // requirements.md#採用基準(カテゴリごとの定量判定)-4(初期値2)。総合・経済/ビジネスにのみ適用
}
