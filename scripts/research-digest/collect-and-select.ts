// 収集・選定のまとめCLI(仕様: content-selection/design.md「収集状況を記録する処理」「ログ」、
// weekly-publish/design.md「1回分の記事を生成する処理」手順2〜3)。TDD対象外
// (関数を順に呼ぶだけで、ジャンルの合流・採用・検証ロジックはselectGenres・collectForGenre等で、
// 警告判定ロジックはshouldAlertOperatorでテスト済みのため。tasks.md Task 6参照)。
// GitHub Actions(weekly-publish)が対象編・本来の配信日を引数に渡してこのスクリプトを呼び出す。
// 標準出力は選定結果のJSONのみとし、実行状況のログは標準エラー出力に出す
//
// 実行方法: npx tsx scripts/research-digest/collect-and-select.ts <body-life|science-society> <配信日 YYYY-MM-DD>
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { loadGenres, getActiveGenres, EDITION_GENRES } from '../../app/research-digest/lib/genres'
import { buildDeliveredIndex } from '../../app/research-digest/lib/deliveredIndex'
import { selectGenres, type CollectionFailedGenre } from '../../app/research-digest/lib/selectGenres'
import { shouldAlertOperator } from '../../app/research-digest/lib/shouldAlertOperator'
import { getAllArticles } from '../../app/research-digest/lib/articles'
import type { Candidate, GenreResult } from '../../app/research-digest/lib/candidateTypes'
import type { Edition } from '../../app/research-digest/lib/types'
import { collectGenre } from './collect-candidates'

const EDITIONS: Edition[] = ['body-life', 'science-society']

function writeGithubOutput(name: string, value: string) {
  const outputPath = process.env.GITHUB_OUTPUT
  if (!outputPath) {
    console.error(`GITHUB_OUTPUTが設定されていないためログにのみ出力します: ${name}=${value}`)
    return
  }
  fs.appendFileSync(outputPath, `${name}=${value}\n`)
}

async function main() {
  const edition = process.argv[2] as Edition | undefined
  const scheduledPublishDate = process.argv[3]
  if (!edition || !EDITIONS.includes(edition) || !scheduledPublishDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledPublishDate)) {
    console.error('使い方: collect-and-select.ts <body-life|science-society> <配信日 YYYY-MM-DD>')
    process.exit(1)
    return
  }

  // 過去記事は検証付きで読み込む。壊れた記事があると配信済みの判定ができないため例外のまま処理を失敗させる
  const articles = getAllArticles()
  // 配信済み判定は編をまたいで全記事を対象にする(content-selection/requirements.md#配信済みの研究の除外-1)
  const deliveredIndex = buildDeliveredIndex(articles)
  const editionGenreIds = new Set(EDITION_GENRES[edition])
  const genres = getActiveGenres(loadGenres()).filter((g) => editionGenreIds.has(g.id))

  console.error(`編: ${edition} / 配信日: ${scheduledPublishDate} / 有効ジャンル数: ${genres.length}`)

  const candidatesByGenre: Record<string, Candidate[]> = {}
  const collectionFailedGenres: CollectionFailedGenre[] = []

  for (const genre of genres) {
    // 利用上限への到達を検知した場合はQuotaExhaustedErrorがここから外へ伝播し、
    // main().catchで非ゼロ終了する(記事を作らずこの回を打ち切り、次の再実行cronに委ねる。
    // weekly-publish/design.md「1回分の記事を生成する処理」手順2)。打ち切った旨は下のcatchでerror出力する
    const result = await collectGenre(genre, deliveredIndex, scheduledPublishDate)
    if (result.status === 'collection-failed') {
      collectionFailedGenres.push({ genre: genre.id, reason: result.reason })
    } else {
      candidatesByGenre[genre.id] = result.candidates
    }
  }

  const results = selectGenres(candidatesByGenre, genres.map((g) => g.id), deliveredIndex, collectionFailedGenres)
  logCollectionSummary(results)

  const alert = shouldAlertOperator(results)
  if (alert) {
    console.error('全ジャンルが収集失敗のため、運営者への警告が必要です(公開はスキップしません)')
  }
  writeGithubOutput('alert', String(alert))

  process.stdout.write(JSON.stringify({ edition, scheduledPublishDate, genreResults: results }, null, 2) + '\n')
}

// 収集状況を実行ログに出す(content-selection/design.md「収集状況を記録する処理」手順1・2)。
// ジャンルごとに、検証を通った候補の件数と採用結果(採用/候補なし/収集失敗)を1行ずつ出し、最後に
// 候補なしのジャンルの一覧と、収集失敗のジャンルの一覧(分類ラベル別の件数つき)をまとめて出す
function logCollectionSummary(results: GenreResult[]) {
  for (const r of results) {
    if (r.status === 'collection-failed') {
      console.error(`ジャンル[${r.genre}]: 収集失敗(${r.reason})`)
    } else if (r.status === 'no-candidate') {
      console.error(`ジャンル[${r.genre}]: 候補${r.candidateCount}件 → 候補なし`)
    } else {
      const c = r.candidate
      console.error(
        `ジャンル[${r.genre}]: 候補${r.candidateCount}件 → 採用(${c.sourceUrl} / DOI: ${c.doi ?? 'なし'} / 影響度: ${c.impact} / 査読前: ${c.isPreprint ? 'はい' : 'いいえ'})`,
      )
    }
  }

  const selected = results.filter((r) => r.status === 'selected')
  const noCandidate = results.filter((r) => r.status === 'no-candidate')
  const failed = results.filter((r): r is Extract<GenreResult, { status: 'collection-failed' }> => r.status === 'collection-failed')
  console.error(`採用件数: ${selected.length}件 / 候補なし: ${noCandidate.length}件 / 収集失敗: ${failed.length}件`)

  console.error(`候補なしのジャンル: ${noCandidate.length > 0 ? noCandidate.map((r) => r.genre).join('、') : 'なし'}`)
  if (failed.length > 0) {
    const countByReason = new Map<string, number>()
    for (const r of failed) countByReason.set(r.reason, (countByReason.get(r.reason) ?? 0) + 1)
    const summary = [...countByReason.entries()].map(([reason, count]) => `${reason}: ${count}件`).join('、')
    console.error(`収集失敗のジャンル: ${failed.map((r) => r.genre).join('、')}(分類ラベル別 ${summary})`)
  } else {
    console.error('収集失敗のジャンル: なし')
  }
}

const isMainModule = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  main().catch((error: unknown) => {
    if (error instanceof Error && error.name === 'QuotaExhaustedError') {
      console.error(`${error.message}。この回は公開せず、再実行cron(最大3回)に委ねます`)
    } else {
      console.error(error)
    }
    process.exit(1)
  })
}

export { main }
