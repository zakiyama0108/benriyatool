// 記事データの書き出しCLI(仕様: weekly-publish/design.md「1回分の記事を生成する処理」手順5、
// 「エラーハンドリング」「関連するファイル(抜粋)」)。assembleArticleの結果を
// content/research-digest/articles/<配信日>.jsonへ書き出すだけの薄いCLIのため、TDD対象外とする
// (組み立てロジック自体はassembleArticle.test.tsで担保済み。tasks.md Task 3参照)
//
// 実行方法:
//   npx tsx scripts/research-digest/write-article.ts <selection.jsonのパス> <generation.jsonのパス>
// selection.jsonはcollect-and-select.tsの標準出力、generation.jsonはgenerate-content.tsの標準出力を
// ファイル化したもの
import fs from 'node:fs'
import path from 'node:path'
import { assembleArticle } from '../../app/research-digest/lib/assembleArticle'
import { parseArticle } from '../../app/research-digest/lib/articleSchema'
import { loadGenres, getActiveGenres, EDITION_GENRES } from '../../app/research-digest/lib/genres'
import type { GenreResult } from '../../app/research-digest/lib/candidateTypes'
import type { Edition, Finding, Genre } from '../../app/research-digest/lib/types'

type SelectionOutput = {
  edition: Edition
  scheduledPublishDate: string
  genreResults: GenreResult[]
}

type GenerationOutput = {
  findings: Finding[]
  failedGenres: Genre[]
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

  const noCandidateGenres = selection.genreResults
    .filter((g): g is Extract<GenreResult, { status: 'no-candidate' }> => g.status === 'no-candidate')
    .map((g) => ({ genre: g.genre }))
  const collectionFailedGenres = selection.genreResults
    .filter((g): g is Extract<GenreResult, { status: 'collection-failed' }> => g.status === 'collection-failed')
    .map((g) => ({ genre: g.genre, collectionFailureReason: g.reason }))

  const editionGenreIds = new Set(EDITION_GENRES[selection.edition])
  const activeGenres = getActiveGenres(loadGenres())
    .filter((g) => editionGenreIds.has(g.id))
    .map((g) => g.id)

  const article = assembleArticle(
    selection.scheduledPublishDate,
    selection.edition,
    activeGenres,
    generation.findings,
    noCandidateGenres,
    collectionFailedGenres,
    generation.failedGenres,
  )

  // 書き出す前にスキーマ検証する(不正なデータをリポジトリに書き出さない。ビルド時バリデーションと
  // 二重になるが、PR作成前に早期検知できる方が望ましい)
  parseArticle(article, `${article.id}.json`)

  const outputDir = path.join(process.cwd(), 'content/research-digest/articles')
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
