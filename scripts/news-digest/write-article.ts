// 記事ファイルの書き出し(仕様: design.md「1週分の記事を生成する処理」手順5)。
// assembleArticleの結果をcontent/news-digest/articles/<date>.jsonへ書き出すだけの薄いCLIの
// ため、TDD対象外とする(組み立て・除外ロジック自体はassembleArticle.test.tsで担保済み。tasks.md Task2参照)
//
// 実行方法: npx tsx scripts/news-digest/write-article.ts <YYYY-MM-DD> <inputs.jsonのパス>
// (inputs.jsonはAssembleArticleInput[]。ワークフローが選定結果(SelectedTopic)と候補ごとの
// generate-content.tsの生成結果を組み合わせて用意する。生成に失敗した候補はcontent: nullにする)
import fs from 'node:fs'
import path from 'node:path'
import { assembleArticle } from '../../app/news-digest/lib/assembleArticle'
import { parseArticle } from '../../app/news-digest/lib/articleSchema'
import type { AssembleArticleInput } from '../../app/news-digest/lib/assembleArticle'

function main() {
  const [date, inputsPath] = process.argv.slice(2)
  if (!date || !inputsPath) {
    console.error('使い方: write-article.ts <YYYY-MM-DD> <inputs.jsonのパス>')
    process.exit(1)
  }

  const inputs = JSON.parse(fs.readFileSync(inputsPath, 'utf8')) as AssembleArticleInput[]
  const article = assembleArticle(date, inputs)

  // 書き出す前にスキーマ検証する(全候補の生成が失敗しtopicsが0件になった場合はここで例外を投げ、
  // 非ゼロ終了する。requirements.md#掲載件数の保証-2「記事を公開せずその週の実行を失敗として終える」)
  parseArticle(article, `${date}.json`)

  const outputDir = path.join(process.cwd(), 'content/news-digest/articles')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `${date}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(article, null, 2) + '\n')
  console.log(`記事データを書き出しました: ${outputPath}`)
}

main()
