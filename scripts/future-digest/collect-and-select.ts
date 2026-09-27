// 収集・選定のまとめCLI(仕様: content-selection/design.md「収集状況を記録する処理」「ログ」、
// weekly-publish/design.md「1回分の記事を生成する処理」手順2〜3)。TDD対象外
// (Task1〜6の関数を順に呼ぶだけで、ジャンルの合流・採用・検証ロジックはTask4〜6で、
// 警告判定ロジックはweekly-publish/tasks.mdのTask1でテスト済みのため。tasks.md Task7参照)。
// GitHub Actions(weekly-publish)が本来の配信日を引数に渡してこのスクリプトを呼び出す。
// 標準出力は選定結果のJSONのみとし、実行状況のログはstderrに出す
//
// 実行方法: npx tsx scripts/future-digest/collect-and-select.ts <配信日 YYYY-MM-DD>
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadGenres, getActiveGenres } from '../../app/future-digest/lib/genres'
import { nextIssueNumber } from '../../app/future-digest/lib/issue'
import { horizonsForIssue } from '../../app/future-digest/lib/types'
import type { Article } from '../../app/future-digest/lib/types'
import { buildDeliveredIndex } from '../../app/future-digest/lib/deliveredIndex'
import { selectSlots, type CollectionFailedGenre } from '../../app/future-digest/lib/selectSlots'
import { shouldAlertOperator } from '../../app/future-digest/lib/shouldAlertOperator'
import { collectGenre } from './collect-candidates'
import type { Candidate } from '../../app/future-digest/lib/candidateTypes'

const ARTICLES_DIR = path.join(process.cwd(), 'content/future-digest/articles')

// article-detail(記事データの読み込み・検証)は別工程で実装するため、ここでは最小限の読み込みに
// とどめる(検証はビルド時のparseArticleが担う。architecture.md#実装順)
function readAllArticles(): Article[] {
  if (!fs.existsSync(ARTICLES_DIR)) return []
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8')) as Article)
}

function writeGithubOutput(name: string, value: string) {
  const outputPath = process.env.GITHUB_OUTPUT
  if (!outputPath) {
    console.error(`GITHUB_OUTPUTが設定されていないためログにのみ出力します: ${name}=${value}`)
    return
  }
  fs.appendFileSync(outputPath, `${name}=${value}\n`)
}

async function main() {
  const scheduledPublishDate = process.argv[2]
  if (!scheduledPublishDate) {
    console.error('使い方: collect-and-select.ts <配信日 YYYY-MM-DD>')
    process.exit(1)
  }

  const articles = readAllArticles()
  const issueNumber = nextIssueNumber(articles)
  const horizons = horizonsForIssue(issueNumber)
  const deliveredIndex = buildDeliveredIndex(articles)
  const genres = getActiveGenres(loadGenres())

  console.error(`配信日: ${scheduledPublishDate} / 回数: ${issueNumber} / 時間軸: ${horizons.join('、')} / 有効ジャンル数: ${genres.length}`)

  const allCandidates: Candidate[] = []
  const collectionFailedGenres: CollectionFailedGenre[] = []

  for (const genre of genres) {
    // 利用上限への到達を検知した場合はQuotaExhaustedErrorがここから外へ伝播し、
    // main().catchで非ゼロ終了する(記事を作らずこの回を打ち切り、次の再実行cronに委ねる。
    // weekly-publish/design.md「1回分の記事を生成する処理」手順2)
    const result = await collectGenre(genre, horizons, deliveredIndex)
    if (result.status === 'collection-failed') {
      console.error(`${genre.label}: 収集失敗(${result.reason})`)
      collectionFailedGenres.push({ genre: genre.id, reason: result.reason })
    } else {
      console.error(`${genre.label}: 候補${result.candidates.length}件`)
      allCandidates.push(...result.candidates)
    }
  }

  const genreIds = genres.map((g) => g.id)
  const slots = selectSlots(allCandidates, genreIds, horizons, deliveredIndex.urls, collectionFailedGenres)

  const noCandidateSlots = slots.filter((s) => s.status === 'no-candidate')
  const collectionFailedSlots = slots.filter((s) => s.status === 'collection-failed')
  const selectedSlots = slots.filter((s) => s.status === 'selected')
  console.error(`採用件数: ${selectedSlots.length}件 / 候補なし: ${noCandidateSlots.length}件 / 収集失敗: ${collectionFailedSlots.length}件`)

  const alert = shouldAlertOperator(slots)
  if (alert) {
    console.error('全枠が収集失敗のため、運営者への警告が必要です(公開はスキップしません)')
  }
  writeGithubOutput('alert', String(alert))

  process.stdout.write(JSON.stringify({ scheduledPublishDate, issueNumber, horizons, slots }, null, 2) + '\n')
}

const isMainModule = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}

export { main }
