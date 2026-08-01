// 記事ファイルの書き出し(仕様: design.md「1日分の記事を生成する処理」手順5)。
// assembleArticleの結果をcontent/ai-dev-digest/articles/<date>.jsonへ書き出すだけの薄いCLIの
// ため、TDD対象外とする(組み立てロジック自体はassembleArticle.test.tsで担保済み。tasks.md Task2参照)
//
// 実行方法: npx tsx scripts/ai-dev-digest/write-article.ts <YYYY-MM-DD> <topics.jsonのパス>
// (topics.jsonはGeneratedTopicInput[]。エージェントが選定・翻訳・要約した結果をこの形式で用意する)
import fs from 'node:fs'
import path from 'node:path'
import { assembleArticle } from '../../app/ai-dev-digest/lib/assembleArticle'
import { parseArticle } from '../../app/ai-dev-digest/lib/articleSchema'
import type { GeneratedTopicInput } from '../../app/ai-dev-digest/lib/assembleArticle'

function main() {
  const [date, topicsPath] = process.argv.slice(2)
  if (!date || !topicsPath) {
    console.error('使い方: write-article.ts <YYYY-MM-DD> <topics.jsonのパス>')
    process.exit(1)
  }

  const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8')) as GeneratedTopicInput[]
  const article = assembleArticle(date, topics)

  // 書き出す前にスキーマ検証する(不正なデータをリポジトリに書き出さない。
  // ビルド時バリデーションと二重になるが、PR作成前に早期検知できる方が望ましい)
  parseArticle(article, `${date}.json`)

  const outputDir = path.join(process.cwd(), 'content/ai-dev-digest/articles')
  fs.mkdirSync(outputDir, { recursive: true })
  const outputPath = path.join(outputDir, `${date}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(article, null, 2) + '\n')
  console.log(`記事データを書き出しました: ${outputPath}`)
}

main()
