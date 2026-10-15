// 図解(概念図)をコードでSVG描画し、public/配下に保存する(仕様: content-generation/
// requirements.md#図解の生成(Cloudflare Workers AI。2026-10改定でAI画像生成からSVG描画に移行)-11、
// app/ai-dev-digest/lib/renderDiagramSvg.ts)。TDD対象外(ファイルI/Oのオーケストレーションの
// ため。SVGの組み立てロジック自体はrenderDiagramSvg.test.tsでテスト済み)
import fs from 'node:fs'
import path from 'node:path'
import { renderDiagramSvg, type DiagramSpec } from '../../app/ai-dev-digest/lib/renderDiagramSvg'
import type { Diagram } from '../../app/ai-dev-digest/lib/types'

// SVGファイルはpublic/配下に保存する(output: 'export'の静的エクスポートでもブラウザから直接
// 配信されるようにするため。content/配下はビルド時にfs読み込みするだけで配信対象ではなく、
// <img src>で参照すると404になる)
const IMAGES_URL_PREFIX = '/content/ai-dev-digest/articles/images'
const IMAGES_DIR = `public${IMAGES_URL_PREFIX}`

export type RenderDiagramInput = {
  date: string // 記事の公開日(YYYY-MM-DD)。保存ファイル名の一部
  topicId: string // トピック識別子(例: "topic-1")。保存ファイル名の一部
  perspectiveKey: string // 観点キー(domain等)。保存ファイル名の一部
  spec: DiagramSpec // エージェントが返した構造化データ(diagramValidation.isValidAgentDiagramで妥当性確認済み)
}

// 失敗時(ファイル書き込み失敗等)はnullを返し、呼び出し元(generate-content.ts)がその観点の
// 図解なしで記事生成を続行できるようにする(requirements.md#図解-17と同じ考え方。SVG描画は
// 外部API呼び出しがなく基本的に失敗しないが、1観点の描画失敗でトピック全体を失敗させない
// という既存の設計方針を維持するためtry/catchで囲む)
export function renderDiagramImage(input: RenderDiagramInput): Diagram | null {
  try {
    const svg = renderDiagramSvg(input.spec)
    const fileName = `${input.date}-${input.topicId}-${input.perspectiveKey}.svg`
    const outputDir = path.join(process.cwd(), IMAGES_DIR)
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, fileName), svg)

    return { type: 'image', path: `${IMAGES_URL_PREFIX}/${fileName}` }
  } catch (error) {
    console.error(
      `図解画像の描画に失敗したため、この観点の図解なしで続行します(${input.topicId}/${input.perspectiveKey}): ${(error as Error).message}`
    )
    return null
  }
}
