// Nano Banana(Gemini 2.5 Flash Image)による図解画像の生成・保存(仕様: specs/trend-digest/
// content-generation/requirements.md#図解の生成(Nano Banana)-8、specs/trend-digest/
// content-generation/design.md「見出し・固定3観点を書く処理」手順12)。TDD対象外
// (外部API呼び出し・ファイルI/Oのオーケストレーションのため。入力の妥当性判定は
// app/trend-digest/lib/diagramValidation.tsでテスト済み。tasks.md Task10)。
//
// news-digestのscripts/news-digest/generateDiagram.tsと同じロジック(保存先のみ
// content/trend-digest/articles/images/に変更)
import fs from 'node:fs'
import path from 'node:path'
import type { Diagram } from '../../app/trend-digest/lib/types'

// Geminiの画像生成モデル(無料枠で使えるもの)。環境変数で差し替え可能にしておく
// (scripts/news-digest/generateDiagram.tsと同じ既定値・運用方式)
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
const IMAGES_DIR = 'content/trend-digest/articles/images'

export type GenerateDiagramInput = {
  date: string // 記事の公開日(YYYY-MM-DD)。保存ファイル名の一部
  topicId: string // トピック識別子(例: "topic-1")。保存ファイル名の一部
  sectionKey: string // 観点キー(fact/reason/caveat)。保存ファイル名の一部
  prompt: string // エージェントが返した画像生成プロンプト(diagramValidation.isValidAgentDiagramで妥当性確認済み)
}

// Gemini 2.5 Flash Image("Nano Banana")APIを1回呼び出し、生成画像(PNGバイト列)を返す
// (requirements.md#図解の生成(Nano Banana)-8)。APIキーが無効・レスポンスに画像が無い場合は例外を投げる
export async function callNanoBanana(prompt: string, apiKey: string): Promise<Buffer> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  )
  if (!res.ok) {
    throw new Error(`Gemini API呼び出しに失敗しました: HTTP ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { data?: string }; inline_data?: { data?: string } }[] } }[]
  }
  for (const part of json.candidates?.[0]?.content?.parts ?? []) {
    const data = part.inlineData?.data ?? part.inline_data?.data
    if (data) return Buffer.from(data, 'base64')
  }
  throw new Error('Gemini APIのレスポンスに画像が含まれていませんでした')
}

// type: 'image'のdiagram(エージェントが返したprompt)に対し、Nano Bananaで画像を生成・保存する。
// 成功時はcontent/trend-digest/articles/images/<date>-<topicId>-<sectionKey>.pngに保存し、
// {type: 'image', path}を返す。失敗時(APIキー未設定・API呼び出し失敗・保存失敗等)はnullを返し、
// 呼び出し元(generate-content.ts)がその観点の図解なしで記事生成を続行できるようにする
// (requirements.md#図解-7。1観点の画像生成失敗でその週全体・そのトピック全体の生成を失敗させない)
export async function generateDiagramImage(input: GenerateDiagramInput): Promise<Diagram | null> {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY が環境変数に設定されていません(GitHub Actions Secretsの設定が別途必要)')
    }
    const image = await callNanoBanana(input.prompt, apiKey)

    const fileName = `${input.date}-${input.topicId}-${input.sectionKey}.png`
    const outputDir = path.join(process.cwd(), IMAGES_DIR)
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, fileName), image)

    return { type: 'image', path: `${IMAGES_DIR}/${fileName}` }
  } catch (error) {
    console.error(
      `図解画像の生成に失敗したため、この観点の図解なしで続行します(${input.topicId}/${input.sectionKey}): ${(error as Error).message}`
    )
    return null
  }
}
