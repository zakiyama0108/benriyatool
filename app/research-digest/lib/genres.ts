import genresData from '../../../content/research-digest/genres.json'

// ジャンルの設定ファイルの読み込み・検証(仕様: content-selection/requirements.md#機能要件-1、
// content-selection/requirements.md#ジャンル-1〜10、content-selection/design.md「データ設計」)。
// active: falseのジャンルは収集対象から外すが、過去記事の表示用にラベルを残す(廃止しても壊れないため)。
// types.tsのGENRE_ORDER/GENRE_LABELSはこのモジュールの結果から組み立てる

// 編成(仕様: content-selection/requirements.md#編成とジャンルの割り当て-1〜2)。各ジャンルは
// どちらか一方の編に固定で属する(ジャンルを編の間で動的に移す機能はスコープ外)
export type Edition = 'body-life' | 'science-society'
const EDITIONS: Edition[] = ['body-life', 'science-society']

export type GenreConfig = {
  id: string
  label: string
  description: string // 収集時にClaudeへ渡すジャンルの範囲の説明
  edition: Edition
  active: boolean
}

// genres.jsonの生データを検証してGenreConfig[]にする(不正な設定はビルド時に例外として検知させる)
export function parseGenres(raw: unknown): GenreConfig[] {
  if (!Array.isArray(raw)) {
    throw new Error('genres.jsonは配列である必要があります')
  }

  const seenIds = new Set<string>()
  return raw.map((item, index) => {
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
    // editionの属性は残す。content-selection/design.md「データ設計」)
    if (!EDITIONS.includes(g.edition as Edition)) {
      throw new Error(`genres.json[${g.id}]: editionが不正です(body-lifeまたはscience-societyである必要があります): ${String(g.edition)}`)
    }
    if (typeof g.active !== 'boolean') {
      throw new Error(`genres.json[${g.id}]: activeは真偽値である必要があります`)
    }
    return { id: g.id, label: g.label, description: g.description, edition: g.edition as Edition, active: g.active }
  })
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
// collect-and-select.ts/write-article.tsの対象ジャンルの絞り込みに使う
export function buildEditionGenres(genres: GenreConfig[]): Record<Edition, string[]> {
  const result: Record<Edition, string[]> = { 'body-life': [], 'science-society': [] }
  for (const g of genres) {
    result[g.edition].push(g.id)
  }
  return result
}

export const EDITION_GENRES: Record<Edition, string[]> = buildEditionGenres(loadGenres())
