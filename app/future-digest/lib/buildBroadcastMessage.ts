import type { Article, Genre, Impact } from './types'
import { GENRE_LABELS, GENRE_ORDER, HORIZON_LABELS, HORIZON_ORDER, IMPACT_LABELS, IMPACT_ORDER, horizonsForIssue } from './types'
import { loadGenres } from './genres'
import { buildArticleUrl } from './articleUrl'

export type Representative = { genre: Genre; heading: string; impact: Impact }

function genreIndex(genre: Genre): number {
  const index = GENRE_ORDER.indexOf(genre)
  return index === -1 ? GENRE_ORDER.length : index
}

// ジャンルごとに影響度が最も大きい代表見出しを選ぶ(仕様: requirements.md#配信内容-3〜5、
// design.md「代表見出しを選ぶ処理」)。genres.jsonのlineExcluded: trueのジャンル(現在は
// 性・恋愛のみ)は対象外にする(ジャンルIDを直接比較するコードは書かない)。掲載した予測が
// 1本もないジャンルは、そもそも予測が存在しないため自然に対象外になる
export function selectRepresentatives(article: Article): Representative[] {
  const lineExcludedGenres = new Set(loadGenres().filter((g) => g.lineExcluded).map((g) => g.id))

  const byGenre = new Map<Genre, Representative>()
  for (const prediction of article.predictions) {
    if (lineExcludedGenres.has(prediction.genre)) continue

    const current = byGenre.get(prediction.genre)
    if (!current) {
      byGenre.set(prediction.genre, { genre: prediction.genre, heading: prediction.heading, impact: prediction.impact })
      continue
    }

    const currentPrediction = article.predictions.find(
      (p) => p.genre === current.genre && p.heading === current.heading
    )!
    const impactDiff = IMPACT_ORDER.indexOf(prediction.impact) - IMPACT_ORDER.indexOf(current.impact)
    if (impactDiff < 0) {
      byGenre.set(prediction.genre, { genre: prediction.genre, heading: prediction.heading, impact: prediction.impact })
    } else if (impactDiff === 0) {
      // 同じ影響度が2本ある場合は時間軸の近い方を代表にする(requirements.md#配信内容-3)
      const currentHorizonIndex = HORIZON_ORDER.indexOf(currentPrediction.horizon)
      const nextHorizonIndex = HORIZON_ORDER.indexOf(prediction.horizon)
      if (nextHorizonIndex < currentHorizonIndex) {
        byGenre.set(prediction.genre, { genre: prediction.genre, heading: prediction.heading, impact: prediction.impact })
      }
    }
  }

  return [...byGenre.values()].sort((a, b) => {
    const impactDiff = IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact)
    if (impactDiff !== 0) return impactDiff
    return genreIndex(a.genre) - genreIndex(b.genre)
  })
}

// LINE配信メッセージ専用の見出し(仕様: requirements.md#配信内容-2、
// design.md「配信メッセージを組み立てる処理」手順1)
export function buildBroadcastTitle(date: string): string {
  const [year, month, day] = date.split('-').map((part) => Number(part))
  return `【週刊未来予測】${year}年${month}月${day}日号`
}

// LINEブロードキャストメッセージの本文を組み立てる(仕様: requirements.md#配信内容-1〜2・6〜7、
// design.md「配信メッセージを組み立てる処理」)。配信専用タイトル・その回の時間軸・代表見出し
// 一覧(影響度・ジャンル名付き)・記事詳細ページリンクの4要素で構成し、予測ごとの出典URL
// (sourceUrl)は含めない。予測が0件(採用0件の回)は代表見出しの行の代わりに固定文言を入れる
export function buildBroadcastMessage(article: Article): string {
  const title = buildBroadcastTitle(article.date)
  const horizons = horizonsForIssue(article.issueNumber)
  const horizonLine = `今回の時間軸: ${HORIZON_LABELS[horizons[0]]}・${HORIZON_LABELS[horizons[1]]}`
  const url = buildArticleUrl(article)

  const lines = [title, horizonLine, '']

  if (article.predictions.length === 0) {
    lines.push('今週は掲載できる予測がありませんでした', '')
  } else {
    const representatives = selectRepresentatives(article)
    if (representatives.length > 0) {
      const headings = representatives
        .map((r) => `・【影響度 ${IMPACT_LABELS[r.impact]}/${GENRE_LABELS[r.genre] ?? r.genre}】${r.heading}`)
        .join('\n')
      lines.push(headings, '')
    }
  }

  lines.push('記事を読む', url)

  return lines.join('\n')
}
