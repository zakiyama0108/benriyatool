// 図解(概念図)をコードでSVG描画し、public/配下に保存する(仕様: content-generation/
// requirements.md#図解の生成(アイコン図のSVG描画)-8、app/trend-digest/lib/renderDiagramSvg.ts)。
// TDD対象外(ファイルI/Oのオーケストレーションのため。SVGの組み立てロジック自体は
// renderDiagramSvg.test.tsでテスト済み)。ai-dev-digestのscripts/ai-dev-digest/renderDiagram.ts
// と同じロジック
import fs from 'node:fs'
import path from 'node:path'
import { renderDiagramSvg, type DiagramSpec } from '../../app/trend-digest/lib/renderDiagramSvg'
import type { Diagram } from '../../app/trend-digest/lib/types'

// SVGファイルはpublic/配下に保存する(output: 'export'の静的エクスポートでもブラウザから直接
// 配信されるようにするため。content/配下はビルド時にfs読み込みするだけで配信対象ではなく、
// <img src>で参照すると404になる)
const IMAGES_URL_PREFIX = '/content/trend-digest/articles/images'
const IMAGES_DIR = `public${IMAGES_URL_PREFIX}`

export type RenderDiagramInput = {
  date: string // 記事の公開日(YYYY-MM-DD)。保存ファイル名の一部
  topicId: string // トピック識別子(例: "topic-1")。保存ファイル名の一部
  sectionKey: string // 観点キー(fact/reason/caveat)。保存ファイル名の一部
  spec: DiagramSpec // エージェントが返した構造化データ(diagramValidation.isValidAgentDiagramで妥当性確認済み)
}

// 失敗時(ファイル書き込み失敗等)はnullを返し、呼び出し元(generate-content.ts)がその観点の
// 図解なしで記事生成を続行できるようにする
export function renderDiagramImage(input: RenderDiagramInput): Diagram | null {
  try {
    const svg = renderDiagramSvg(input.spec)
    const fileName = `${input.date}-${input.topicId}-${input.sectionKey}.svg`
    const outputDir = path.join(process.cwd(), IMAGES_DIR)
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, fileName), svg)

    return { type: 'image', path: `${IMAGES_URL_PREFIX}/${fileName}` }
  } catch (error) {
    console.error(
      `図解画像の描画に失敗したため、この観点の図解なしで続行します(${input.topicId}/${input.sectionKey}): ${(error as Error).message}`
    )
    return null
  }
}
