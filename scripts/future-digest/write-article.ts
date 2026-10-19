// 記事データの書き出しCLI(仕様: weekly-publish/design.md「1回分の記事を生成する処理」手順5、
// 「関連するファイル(抜粋)」)。assembleArticleの結果をcontent/future-digest/articles/<配信日>.jsonへ
// 書き出すだけの薄いCLIのため、TDD対象外とする(組み立てロジック自体はassembleArticle.test.tsで
// 担保済み。tasks.md Task3参照。trend-digestのwrite-article.tsと同じ構成)
//
// 実行方法:
//   npx tsx scripts/future-digest/write-article.ts <selection.jsonのパス> <generation.jsonのパス>
// selection.jsonはcollect-and-select.tsの標準出力、generation.jsonはgenerate-content.tsの標準出力を
// ファイル化したもの
import fs from 'node:fs'
import path from 'node:path'
import { assembleArticle } from '../../app/future-digest/lib/assembleArticle'
import { parseArticle } from '../../app/future-digest/lib/articleSchema'
import { loadGenres, getActiveGenres, EDITION_GENRES } from '../../app/future-digest/lib/genres'
import type { SlotResult } from '../../app/future-digest/lib/candidateTypes'
import type { Edition, Genre, Horizon, Prediction } from '../../app/future-digest/lib/types'

type SelectionOutput = {
  edition: Edition
  scheduledPublishDate: string
  issueNumber: number
  slots: SlotResult[]
}

type GenerationOutput = {
  predictions: Prediction[]
  failedCandidates: { genre: Genre; horizon: Horizon }[]
}

function main() {
  const [selectionPath, generationPath] = process.argv.slice(2)
  if (!selectionPath || !generationPath) {
    console.error('使い方: write-article.ts <selection.jsonのパス> <generation.jsonのパス>')
    process.exit(1)
    return
  }

  const selection = JSON.parse(fs.readFileSync(selectionPath, 'utf8')) as SelectionOutput
  const generation = JSON.parse(fs.readFileSync(generationPath, 'utf8')) as GenerationOutput

  const noCandidateSlots = selection.slots
    .filter((s): s is Extract<SlotResult, { status: 'no-candidate' }> => s.status === 'no-candidate')
    .map((s) => ({ genre: s.genre, horizon: s.horizon }))
  const collectionFailedSlots = selection.slots
    .filter((s): s is Extract<SlotResult, { status: 'collection-failed' }> => s.status === 'collection-failed')
    .map((s) => ({ genre: s.genre, horizon: s.horizon, collectionFailureReason: s.reason }))

  const editionGenreIds = new Set(EDITION_GENRES[selection.edition])
  const activeGenres = getActiveGenres(loadGenres())
    .filter((g) => editionGenreIds.has(g.id))
    .map((g) => g.id)

  const article = assembleArticle(
    selection.scheduledPublishDate,
    selection.edition,
    selection.issueNumber,
    activeGenres,
    generation.predictions,
    noCandidateSlots,
    collectionFailedSlots,
    generation.failedCandidates,
  )

  // 書き出す前にスキーマ検証する(不正なデータをリポジトリに書き出さない。ビルド時バリデーションと
  // 二重になるが、PR作成前に早期検知できる方が望ましい。trend-digestのwrite-article.tsと同じ考え方)
  parseArticle(article, `${article.id}.json`)

  const outputDir = path.join(process.cwd(), 'content/future-digest/articles')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `${article.id}.json`)

  // 同じ配信日の記事ファイルが既にある場合は上書きせず失敗として終える(同じ回の二重公開を防ぐ。
  // weekly-publish/design.md「エラーハンドリング」)
  if (fs.existsSync(outputPath)) {
    console.error(`同じ配信日の記事ファイルが既に存在するため上書きしません: ${outputPath}`)
    process.exit(1)
    return
  }

  fs.writeFileSync(outputPath, JSON.stringify(article, null, 2) + '\n')
  console.log(`記事データを書き出しました: ${outputPath}`)
}

main()
