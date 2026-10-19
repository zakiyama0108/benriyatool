import fixedSourcesData from '../../../content/future-digest/fixedSources.json'
import { loadGenres } from './genres'

// 固定情報源の設定ファイルの読み込み・検証(仕様: content-selection/requirements.md#情報源(固定リスト)-1〜5、
// content-selection/design.md「データ設計(固定情報源)」)。genres.tsと同じ考え方で、不正な設定は
// ビルド時に例外として検知する

export type FixedSourceChannel =
  | { type: 'feed'; url: string } // RSS/Atom/RDFの標準フィード。共通パーサーで解析
  | { type: 'site-specific-html'; url: string; parserId: string } // 公式フィードがない情報源の専用パーサー

export type FixedSourceEntry = {
  genreId: string // genres.jsonのid
  name: string
  channel: FixedSourceChannel
}

export type FixedSourceHint = {
  sourceName: string
  title: string
  url: string
  publishedAt: string | null // 取得元で日付が分かる場合のみ
}

const CHANNEL_TYPES = ['feed', 'site-specific-html']

// fixedSources.jsonの生データを検証してFixedSourceEntry[]にする(design.md「データ設計(固定情報源)」)
export function parseFixedSources(raw: unknown, validGenreIds: string[]): FixedSourceEntry[] {
  if (!Array.isArray(raw)) {
    throw new Error('fixedSources.jsonは配列である必要があります')
  }
  const validGenreIdSet = new Set(validGenreIds)

  return raw.map((item, index) => {
    const e = item as Record<string, unknown>
    const genreId = e.genreId
    if (typeof genreId !== 'string' || !validGenreIdSet.has(genreId)) {
      throw new Error(`fixedSources.json[${index}]: genreIdが不正です(genres.jsonに存在しないid): ${String(genreId)}`)
    }
    const name = e.name
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error(`fixedSources.json[${index}]: nameが不正です`)
    }
    const channel = e.channel as Record<string, unknown> | undefined
    if (!channel || typeof channel.url !== 'string' || channel.url.trim() === '') {
      throw new Error(`fixedSources.json[${name}]: channel.urlが不正です`)
    }
    if (!CHANNEL_TYPES.includes(channel.type as string)) {
      throw new Error(`fixedSources.json[${name}]: channel.typeが不正です(feedまたはsite-specific-htmlである必要があります): ${String(channel.type)}`)
    }
    if (channel.type === 'site-specific-html' && (typeof channel.parserId !== 'string' || channel.parserId.trim() === '')) {
      throw new Error(`fixedSources.json[${name}]: site-specific-htmlにはparserIdが必須です`)
    }
    return { genreId, name, channel: channel as FixedSourceChannel }
  })
}

export function loadFixedSources(): FixedSourceEntry[] {
  const validGenreIds = loadGenres().map((g) => g.id)
  return parseFixedSources(fixedSourcesData, validGenreIds)
}

// 対象ジャンルの固定情報源だけを記載順のまま返す(固定情報源がないジャンルは空配列)
export function getFixedSourcesForGenre(entries: FixedSourceEntry[], genreId: string): FixedSourceEntry[] {
  return entries.filter((e) => e.genreId === genreId)
}
