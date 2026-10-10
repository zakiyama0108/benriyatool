import genresData from '../../../content/future-digest/genres.json'

// ジャンル・注目テーマの設定ファイルの読み込み・検証(仕様: content-selection/requirements.md#機能要件-1、
// content-selection/requirements.md#ジャンル-1〜10、content-selection/design.md「データ設計」)。
// active: falseのジャンルは収集対象から外すが、過去記事の表示用にラベルを残す(廃止しても壊れないため)。
// types.tsのGENRE_ORDER/GENRE_LABELS(article-detail実装時に追加)はこのモジュールの結果から組み立てる

// 編成(仕様: content-selection/requirements.md#編成とジャンルの割り当て-1〜2)。各ジャンルはどちらか
// 一方の編に固定で属する(ジャンルを編の間で動的に移す機能はスコープ外)
export type Edition = 'science-tech' | 'life-society'
const EDITIONS: Edition[] = ['science-tech', 'life-society']

export type GenreConfig = {
  id: string
  label: string
  description: string
  edition: Edition
  themes?: string[]
  active: boolean
  lineExcluded: boolean // LINE配信の代表見出しから除くかどうか(line-broadcast/requirements.md#配信内容-4)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

// genres.jsonの生データを検証してGenreConfig[]にする(不正な設定はビルド時に例外として検知させる)
export function parseGenres(raw: unknown): GenreConfig[] {
  if (!Array.isArray(raw)) {
    throw new Error('genres.jsonは配列である必要があります')
  }

  const seenIds = new Set<string>()
  const genres: GenreConfig[] = raw.map((item, index) => {
    const g = item as Partial<GenreConfig>
    if (typeof g.id !== 'string' || g.id.trim() === '') {
      throw new Error(`genres.json[${index}]: idが不正です`)
    }
    if (seenIds.has(g.id)) {
      throw new Error(`genres.json: idが重複しています: ${g.id}`)
    }
    seenIds.add(g.id)
    if (typeof g.label !== 'string' || g.label.trim() === '') {
      throw new Error(`genres.json[${g.id}]: labelが不正です`)
    }
    if (typeof g.description !== 'string' || g.description.trim() === '') {
      throw new Error(`genres.json[${g.id}]: descriptionが不正です`)
    }
    // editionは2値のみ許可し、未指定・それ以外の値は例外にする(廃止ジャンルもactive: falseのまま
    // editionの属性は残す。design.md「データ設計(ジャンル・注目テーマの設定ファイル)」)
    if (!EDITIONS.includes(g.edition as Edition)) {
      throw new Error(`genres.json[${g.id}]: editionが不正です(science-techまたはlife-societyである必要があります): ${String(g.edition)}`)
    }
    if (g.themes !== undefined && !isStringArray(g.themes)) {
      throw new Error(`genres.json[${g.id}]: themesは文字列配列である必要があります`)
    }
    if (typeof g.active !== 'boolean') {
      throw new Error(`genres.json[${g.id}]: activeは真偽値である必要があります`)
    }
    if (typeof g.lineExcluded !== 'boolean') {
      throw new Error(`genres.json[${g.id}]: lineExcludedは真偽値である必要があります`)
    }
    return {
      id: g.id,
      label: g.label,
      description: g.description,
      edition: g.edition as Edition,
      themes: g.themes,
      active: g.active,
      lineExcluded: g.lineExcluded,
    }
  })

  // line-broadcastの代表見出し選定がジャンルIDの直接比較に依存しないことを保証する
  // (design.md「データ設計」。lineExcluded: trueのジャンルが1つ以上必要)
  if (!genres.some((g) => g.lineExcluded === true)) {
    throw new Error('genres.json: lineExcluded: trueのジャンルが1つ以上必要です')
  }

  return genres
}

export function loadGenres(): GenreConfig[] {
  return parseGenres(genresData)
}

// 収集対象(active: trueのみ)のジャンルを、genres.jsonの記載順のまま返す
export function getActiveGenres(genres: GenreConfig[]): GenreConfig[] {
  return genres.filter((g) => g.active)
}

// 編ごとのジャンルID配列(genres.jsonのedition属性から組み立てる。記載順を保つ)。
// parseArticleの編内ジャンル検証(article-detail/design.md「バリデーション」)、
// collect-and-select.tsの対象ジャンルの絞り込みに使う
export function buildEditionGenres(genres: GenreConfig[]): Record<Edition, string[]> {
  const result: Record<Edition, string[]> = { 'science-tech': [], 'life-society': [] }
  for (const g of genres) {
    result[g.edition].push(g.id)
  }
  return result
}

export const EDITION_GENRES: Record<Edition, string[]> = buildEditionGenres(loadGenres())
