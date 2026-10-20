// 固定情報源の型定義・読み込み・検証(仕様: content-selection/requirements.md#情報源(固定リスト)、
// content-selection/design.md「データ設計(固定情報源)」)。実データはcontent/research-digest/
// fixedSources.jsonに置く(requirements.mdとの二重管理。変更はsource-reviewの月次見直しのみで行う)
import fixedSourcesData from '../../../content/research-digest/fixedSources.json'
import { loadGenres } from './genres'
import { SITE_SPECIFIC_PARSERS } from './fixedSourceParsers'

export type FixedSourceChannel =
  | { type: 'feed'; url: string } // RSS/Atom/RDFの標準フィード。共通パーサーで解析
  | { type: 'site-specific-html'; url: string; parserId: string } // 公式フィードがない情報源の専用パーサー(fixedSourceParsers.ts)

export type FixedSourceEntry = {
  genreId: string // genres.jsonのid
  name: string
  channel: FixedSourceChannel
}

// 取得した新着1件(design.md「固定情報源からヒントを集める処理」)。Claudeへの候補の手がかりに過ぎず、
// 無条件に採用されるわけではない(requirements.md#情報源(固定リスト)-1)
export type FixedSourceHint = {
  sourceName: string
  title: string
  url: string
  publishedAt: string | null // 取得元で日付が分かる場合のみ
}

// fixedSources.jsonの生データを検証してFixedSourceEntry[]にする(不正な設定はビルド時に例外として検知させる)。
// validParserIdsは未指定の場合SITE_SPECIFIC_PARSERSの登録済みparserIdを使う(typoがあっても実行時まで
// 検知できず静かに失敗する問題の対策)
export function parseFixedSources(raw: unknown, validGenreIds: string[], validParserIds: string[] = Object.keys(SITE_SPECIFIC_PARSERS)): FixedSourceEntry[] {
  if (!Array.isArray(raw)) {
    throw new Error('fixedSources.jsonは配列である必要があります')
  }
  const validParserIdSet = new Set(validParserIds)

  return raw.map((item, index) => {
    const e = item as Partial<FixedSourceEntry>
    if (typeof e.genreId !== 'string' || !validGenreIds.includes(e.genreId)) {
      throw new Error(`fixedSources.json[${index}]: genreIdが不正です(genres.jsonの有効なidである必要があります): ${String(e.genreId)}`)
    }
    if (typeof e.name !== 'string' || e.name.trim() === '') {
      throw new Error(`fixedSources.json[${index}]: nameが不正です`)
    }
    const channel = e.channel as Partial<FixedSourceChannel> | undefined
    if (!channel || (channel.type !== 'feed' && channel.type !== 'site-specific-html')) {
      throw new Error(`fixedSources.json[${e.name}]: channel.typeはfeedまたはsite-specific-htmlである必要があります: ${String(channel?.type)}`)
    }
    if (typeof channel.url !== 'string' || channel.url.trim() === '') {
      throw new Error(`fixedSources.json[${e.name}]: channel.urlが不正です`)
    }
    if (channel.type === 'site-specific-html') {
      const parserId = (channel as { parserId?: unknown }).parserId
      if (typeof parserId !== 'string' || parserId.trim() === '') {
        throw new Error(`fixedSources.json[${e.name}]: channel.type「site-specific-html」はparserIdが必須です`)
      }
      if (!validParserIdSet.has(parserId)) {
        throw new Error(`fixedSources.json[${e.name}]: parserId「${parserId}」に対応する登録済みパーサーがありません`)
      }
    }
    return { genreId: e.genreId, name: e.name, channel: channel as FixedSourceChannel }
  })
}

export function loadFixedSources(): FixedSourceEntry[] {
  const validGenreIds = loadGenres().map((g) => g.id)
  return parseFixedSources(fixedSourcesData, validGenreIds)
}
