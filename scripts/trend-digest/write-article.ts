// 記事ファイルの書き出し(仕様: design.md「1回分の記事を生成する処理」手順5、「関連するファイル(抜粋)」)。
// assembleArticleの結果をcontent/trend-digest/articles/<id>.jsonへ書き出すだけの薄いCLIのため、
// TDD対象外とする(組み立てロジック自体はassembleArticle.test.tsで担保済み。tasks.md Task2参照)
//
// 実行方法: npx tsx scripts/trend-digest/write-article.ts <entertainment|culture-lifestyle> <YYYY-MM-DD> <topics.jsonのパス>
// (topics.jsonはGeneratedTopicInput[]。scripts/trend-digest/generate-content.tsの標準出力をファイル化したもの)
import fs from 'node:fs'
import path from 'node:path'
import { assembleArticle, type GeneratedTopicInput } from '../../app/trend-digest/lib/assembleArticle'
import { parseArticle } from '../../app/trend-digest/lib/articleSchema'

function main() {
  const [edition, date, topicsPath] = process.argv.slice(2)
  if (
    (edition !== 'entertainment' && edition !== 'culture-lifestyle') ||
    !date ||
    !topicsPath
  ) {
    console.error('使い方: write-article.ts <entertainment|culture-lifestyle> <YYYY-MM-DD> <topics.jsonのパス>')
    process.exit(1)
    return
  }

  const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8')) as GeneratedTopicInput[]
  const article = assembleArticle(edition, date, topics)

  // 書き出す前にスキーマ検証する(不正なデータをリポジトリに書き出さない。
  // ビルド時バリデーションと二重になるが、PR作成前に早期検知できる方が望ましい)
  parseArticle(article, `${article.id}.json`)

  const outputDir = path.join(process.cwd(), 'content/trend-digest/articles')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `${article.id}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(article, null, 2) + '\n')
  console.log(`記事データを書き出しました: ${outputPath}`)
}

main()
