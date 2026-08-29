// 登録依頼からゲームを登録するローカルツールの書き込み部分
// (仕様: admin/design.md「登録依頼からゲームを登録するローカルツール」、admin/tasks.md T8)。
// TDD対象外(Webアプリのコードではなく、Claude Code Skillが生成したJSONをSupabaseへ
// 書き込むだけの薄いラッパーのため。検証可能な決定的ロジックを持たない)。
//
// 依存関係(dotenv/@supabase/supabase-js)を本体package.jsonから隔離するため、
// このディレクトリは独立したpackage.jsonを持つ(scripts/ai-dev-digest/collect-review-data/と
// 同じ隔離パターン。tsconfig.json/eslint.config.mjsの除外設定を参照)。
//
// 実行方法:
//   cd scripts/board-game-rules && npm install && \
//   SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx registerGame.ts <入力JSONのパス>
//
// 入力JSON(GameRegistrationInput)は、写真の由来によって次のいずれかを持つ:
//   - requestId: 登録依頼(board_game_rules_game_requests)由来の場合、そのidを指定する。
//     依頼保存時の写真パスをそのままphoto_pathsへ引き継ぐ(新たなアップロードは行わない)
//   - photosDir: 依頼を経由しない場合、ローカルの写真フォルダのパスを指定する。
//     フォルダ内の画像ファイルを非公開Storageへ新規アップロードする
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { autocompleteIntroPhotos } from './gameIntroPhotos'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 対話セッション向けの.env.local(docs/adr/0004。CIには含めない)からSUPABASE_URLを読む想定
config({ path: path.join(__dirname, '../../.env.local') })

const PHOTOS_BUCKET = 'board-game-rules-photos'
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'])

type RuleChapterInput = { key: string; body: string }

type GameRegistrationInput = {
  requestId?: string
  photosDir?: string
  name: string
  minPlayers: number
  maxPlayers: number
  minMinutes: number
  maxMinutes: number
  genres: string[]
  minAge?: number
  difficulty?: string
  publisher?: string
  author?: string
  hasJapaneseRules?: boolean
  awards?: string
  releaseYear?: number
  rulesSimple: string
  rulesDetailed: RuleChapterInput[]
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`${name} が環境変数に設定されていません`)
    process.exit(1)
  }
  return value
}

async function resolvePhotoPaths(
  supabase: ReturnType<typeof createClient>,
  input: GameRegistrationInput
): Promise<string[]> {
  if (input.requestId) {
    const { data, error } = await supabase
      .from('board_game_rules_game_requests')
      .select('photo_paths')
      .eq('id', input.requestId)
      .single()
    if (error || !data) {
      throw new Error(`登録依頼(${input.requestId})の取得に失敗しました: ${error?.message ?? '該当なし'}`)
    }
    return (data as { photo_paths: string[] }).photo_paths
  }

  if (input.photosDir) {
    const files = fs
      .readdirSync(input.photosDir)
      .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
      .sort()
    if (files.length === 0) {
      throw new Error(`${input.photosDir} に画像ファイルが見つかりません`)
    }
    const uploadId = randomUUID()
    const photoPaths: string[] = []
    for (const [index, file] of files.entries()) {
      const ext = path.extname(file).slice(1)
      const storagePath = `${uploadId}/${index}.${ext}`
      const fileBuffer = fs.readFileSync(path.join(input.photosDir, file))
      const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(storagePath, fileBuffer)
      if (error) {
        throw new Error(`写真のアップロードに失敗しました(${file}): ${error.message}`)
      }
      photoPaths.push(storagePath)
    }
    return photoPaths
  }

  throw new Error('入力JSONにrequestIdまたはphotosDirのいずれかが必要です')
}

// ゲーム紹介画像(intro_photo_paths)を決める。
// - 依頼由来で既に紹介画像が添付されていれば、それをそのまま引き継ぐ(design.md「登録実行・下書きレビューの処理」手順4)
// - 0枚の場合はゲーム名で自動補完(BoardGameGeek検索 + Gemini加工 + 公開Storageアップロード。T6b)。
//   依頼由来のときは補完結果を依頼行の intro_photo_paths にも書き戻す(design.md「ゲーム紹介画像を自動補完する処理」手順4)
async function resolveIntroPhotoPaths(
  supabase: ReturnType<typeof createClient>,
  input: GameRegistrationInput
): Promise<string[]> {
  if (input.requestId) {
    const { data } = await supabase
      .from('board_game_rules_game_requests')
      .select('intro_photo_paths')
      .eq('id', input.requestId)
      .single()
    const existing = (data as { intro_photo_paths: string[] } | null)?.intro_photo_paths ?? []
    if (existing.length > 0) return existing
  }

  const uploadId = randomUUID()
  const generated = await autocompleteIntroPhotos(supabase, {
    gameName: input.name,
    uploadId,
    geminiApiKey: process.env.GEMINI_API_KEY,
  })
  if (generated.length > 0 && input.requestId) {
    await supabase
      .from('board_game_rules_game_requests')
      .update({ intro_photo_paths: generated })
      .eq('id', input.requestId)
  }
  return generated
}

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('使い方: registerGame.ts <入力JSONのパス>')
    process.exit(1)
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  // service_role相当の権限でRLSをバイパスする(admin/design.md「データベース設計」の想定どおり、
  // board_game_rules_gamesへのINSERTはWeb側anon/authenticatedには許可されていないため)
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as GameRegistrationInput

  const photoPaths = await resolvePhotoPaths(supabase, input)
  const introPhotoPaths = await resolveIntroPhotoPaths(supabase, input)

  const { data, error } = await supabase
    .from('board_game_rules_games')
    .insert({
      name: input.name,
      min_players: input.minPlayers,
      max_players: input.maxPlayers,
      min_minutes: input.minMinutes,
      max_minutes: input.maxMinutes,
      genres: input.genres,
      min_age: input.minAge ?? null,
      difficulty: input.difficulty ?? null,
      publisher: input.publisher ?? null,
      author: input.author ?? null,
      has_japanese_rules: input.hasJapaneseRules ?? null,
      awards: input.awards ?? null,
      release_year: input.releaseYear ?? null,
      rules_simple: input.rulesSimple,
      rules_detailed: input.rulesDetailed,
      photo_paths: photoPaths,
      intro_photo_paths: introPhotoPaths,
    })
    .select('id')
    .single()
  if (error) {
    throw new Error(`ゲームの登録に失敗しました: ${error.message}`)
  }

  const gameId = (data as { id: string }).id
  console.log(`登録しました: ${gameId}`)

  if (input.requestId) {
    const { error: updateError } = await supabase
      .from('board_game_rules_game_requests')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', input.requestId)
    if (updateError) {
      throw new Error(`登録依頼(${input.requestId})の処理済み更新に失敗しました: ${updateError.message}`)
    }
    console.log(`登録依頼を処理済みにしました: ${input.requestId}`)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
