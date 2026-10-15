// Cloudflare Workers AI(FLUXモデル)による図解画像の生成・保存(仕様: specs/ai-dev-digest/
// content-generation/requirements.md#図解の生成(Cloudflare Workers AI)-11、
// specs/ai-dev-digest/content-generation/design.md「要約を書く処理」手順13)。TDD対象外
// (外部API呼び出し・ファイルI/Oのオーケストレーションのため。入力の妥当性判定は
// app/ai-dev-digest/lib/diagramValidation.tsでテスト済み。content-generation/tasks.md Task15)。
//
// scripts/news-digest/generateDiagram.tsと同じロジック(保存先のみcontent/ai-dev-digest/articles/images/に変更)。
// 2026-10改定: 当初はGemini 2.5 Flash Image("Nano Banana")を使っていたが、無料枠の提供が
// 終了したため、無料で使えるCloudflare Workers AI(FLUX)に切り替えた
import fs from 'node:fs'
import path from 'node:path'
import type { Diagram } from '../../app/ai-dev-digest/lib/types'

// Workers AIの画像生成モデル(無料枠で使えるもの)。環境変数で差し替え可能にしておく
// (scripts/news-digest/generateDiagram.tsと同じ既定値・運用方式)
const WORKERS_AI_MODEL = process.env.WORKERS_AI_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell'
// 生成画像はpublic/配下に保存する(output: 'export'の静的エクスポートでもブラウザから直接配信される
// ようにするため。content/配下はビルド時にfs読み込みするだけで配信対象ではなく、<img src>で参照すると
// 404になる。IMAGES_URL_PREFIXがDiagram.pathに入れる配信用パス、IMAGES_DIRがfs書き込み先)
const IMAGES_URL_PREFIX = '/content/ai-dev-digest/articles/images'
const IMAGES_DIR = `public${IMAGES_URL_PREFIX}`

export type GenerateDiagramInput = {
  date: string // 記事の公開日(YYYY-MM-DD)。保存ファイル名の一部
  topicId: string // トピック識別子(例: "topic-1")。保存ファイル名の一部
  perspectiveKey: string // 観点キー(domain等)。保存ファイル名の一部
  prompt: string // エージェントが返した画像生成プロンプト(diagramValidation.isValidAgentDiagramで妥当性確認済み)
}

// Cloudflare Workers AI(FLUX)APIを1回呼び出し、生成画像(PNGバイト列)を返す
// (requirements.md#図解の生成(Cloudflare Workers AI)-11)。トークンが無効・レスポンスに画像が無い場合は例外を投げる
export async function callWorkersAI(prompt: string, accountId: string, apiToken: string): Promise<Buffer> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${WORKERS_AI_MODEL}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ prompt }),
    }
  )
  if (!res.ok) {
    throw new Error(`Cloudflare Workers AI呼び出しに失敗しました: HTTP ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as { success?: boolean; result?: { image?: string }; errors?: unknown[] }
  if (json.result?.image) return Buffer.from(json.result.image, 'base64')
  throw new Error(`Cloudflare Workers AIのレスポンスに画像が含まれていませんでした: ${JSON.stringify(json.errors ?? json)}`)
}

// type: 'image'のdiagram(エージェントが返したprompt)に対し、Workers AIで画像を生成・保存する。
// 成功時はpublic/content/ai-dev-digest/articles/images/<date>-<topicId>-<perspectiveKey>.pngに保存し、
// {type: 'image', path}を返す。失敗時(認証情報未設定・API呼び出し失敗・保存失敗等)はnullを返し、
// 呼び出し元(generate-content.ts)がその観点の図解なしで記事生成を続行できるようにする
// (requirements.md#図解-17。1観点の画像生成失敗でそのトピック全体の生成を失敗させない)
export async function generateDiagramImage(input: GenerateDiagramInput): Promise<Diagram | null> {
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN
    if (!accountId || !apiToken) {
      throw new Error(
        'CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_API_TOKEN が環境変数に設定されていません(GitHub Actions Secretsの設定が別途必要)'
      )
    }
    const image = await callWorkersAI(input.prompt, accountId, apiToken)

    const fileName = `${input.date}-${input.topicId}-${input.perspectiveKey}.png`
    const outputDir = path.join(process.cwd(), IMAGES_DIR)
    fs.mkdirSync(outputDir, { recursive: true })
    fs.writeFileSync(path.join(outputDir, fileName), image)

    return { type: 'image', path: `${IMAGES_URL_PREFIX}/${fileName}` }
  } catch (error) {
    console.error(
      `図解画像の生成に失敗したため、この観点の図解なしで続行します(${input.topicId}/${input.perspectiveKey}): ${(error as Error).message}`
    )
    return null
  }
}
