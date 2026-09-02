// ゲーム紹介画像の自動補完(仕様: specs/board-game-rules/admin/design.md「ゲーム紹介画像を自動補完する処理」、
// admin/tasks.md T6b)。TDD対象外(外部API呼び出しを伴い、検証可能な決定的ロジックを持たないため。
// 動作確認は実在/非実在のゲーム名での実呼び出しで行う)。
//
// 手動フロー(registerGame.ts)・自動フロー(processRegistrationQueue.ts)の両方から呼ばれる。
// BoardGameGeek API(無料・キー不要)でゲーム名を検索し box art を取得 → Google Gemini API
// (画像生成/編集モデル、無料枠)でそのまま転載しない新規画像を生成 → 公開Storageバケットへ
// 新規採番したアップロードUUID配下でアップロードし、そのパス配列を返す。
// 画像検索・AI加工のいずれかが失敗しても処理自体は止めず、理由をコンソールに出して空配列を返す
// (ゲーム登録は続行する。design.md「ログ」)。
import { createClient } from '@supabase/supabase-js'

type SupabaseClient = ReturnType<typeof createClient>

// ゲーム紹介画像の公開バケット(仕様: admin/design.md「ゲーム紹介画像の公開Storage」)
const GAME_PHOTOS_BUCKET = 'board-game-rules-game-photos'
// Geminiの画像生成/編集モデル(無料枠で使えるもの)。環境変数で差し替え可能にしておく
const GEMINI_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image-preview'

// BoardGameGeek APIでゲーム名を検索し、最初の候補の box art 画像URLを返す。
// 該当なしのときは null(呼び出し側は紹介画像なしで続行する)。
export async function findBoxArtUrl(gameName: string): Promise<string | null> {
  const searchUrl = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(gameName)}`
  const searchRes = await fetch(searchUrl)
  if (!searchRes.ok) {
    throw new Error(`BoardGameGeek検索に失敗しました: HTTP ${searchRes.status}`)
  }
  const searchXml = await searchRes.text()
  // XMLの依存を足さず、最初の <item ... id="123"> だけを取り出す
  const idMatch = searchXml.match(/<item[^>]*\bid="(\d+)"/)
  if (!idMatch) return null

  const thingRes = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${idMatch[1]}`)
  if (!thingRes.ok) {
    throw new Error(`BoardGameGeek詳細取得に失敗しました: HTTP ${thingRes.status}`)
  }
  const thingXml = await thingRes.text()
  const imageMatch = thingXml.match(/<image>\s*([^<]+?)\s*<\/image>/)
  if (!imageMatch) return null
  const url = imageMatch[1].trim()
  return url.startsWith('//') ? `https:${url}` : url
}

// 参考画像URLを Gemini API に渡し、そのまま転載しない新規画像(PNGバイト列)を生成する。
export async function generateProcessedImage(
  sourceImageUrl: string,
  gameName: string,
  apiKey: string
): Promise<Buffer> {
  const imgRes = await fetch(sourceImageUrl)
  if (!imgRes.ok) {
    throw new Error(`参考画像の取得に失敗しました: HTTP ${imgRes.status}`)
  }
  const mimeType = imgRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
  const sourceB64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64')

  // 著作権配慮(game-registration/requirements.md#ゲーム紹介画像の取り扱い): 原画の構図・ロゴ・
  // パッケージ上の文字を再現せず、雰囲気だけを参考にした新規イラストを作らせる
  const prompt =
    `これはボードゲーム「${gameName}」のパッケージの参考画像です。この画像をそのまま使うのではなく、` +
    `色調・モチーフの雰囲気だけを参考にした、新しいイラスト調のゲーム紹介画像を1枚生成してください。` +
    `原画の構図をなぞらず、ロゴ・商品パッケージ上の文字・実在の人物写真は含めないでください。`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: sourceB64 } }] },
        ],
      }),
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

// 紹介画像0枚のゲームに対し、BoardGameGeek検索 + Gemini加工 + 公開Storageアップロードで
// 紹介画像を1枚補完し、そのStorageパス配列を返す。
// 失敗(検索ヒットなし・API失敗・アップロード失敗)時は空配列を返し、理由をコンソールに出す。
export async function autocompleteIntroPhotos(
  supabase: SupabaseClient,
  opts: { gameName: string; uploadId: string; geminiApiKey: string | undefined }
): Promise<string[]> {
  try {
    if (!opts.gameName?.trim()) {
      console.warn('ゲーム名が空のため、ゲーム紹介画像の自動補完をスキップします')
      return []
    }
    if (!opts.geminiApiKey) {
      console.warn('GEMINI_API_KEY(ローカル.env)が未設定のため、ゲーム紹介画像の自動補完をスキップします')
      return []
    }

    const boxArtUrl = await findBoxArtUrl(opts.gameName)
    if (!boxArtUrl) {
      console.warn(`BoardGameGeekで「${opts.gameName}」が見つかりませんでした。紹介画像なしで続行します`)
      return []
    }

    const image = await generateProcessedImage(boxArtUrl, opts.gameName, opts.geminiApiKey)

    // パスは依頼時の投稿画像と同じ「アップロードUUID配下」の命名規則を使う(公開時もパスの付け替えはしない。
    // 自動フローではこの時点でゲームIDが未確定のため。design.md「ゲーム紹介画像を自動補完する処理」手順4)
    const storagePath = `${opts.uploadId}/0.png`
    const { error } = await supabase.storage
      .from(GAME_PHOTOS_BUCKET)
      .upload(storagePath, image, { contentType: 'image/png', upsert: true })
    if (error) {
      throw new Error(`生成画像のアップロードに失敗しました: ${error.message}`)
    }
    console.log(`ゲーム紹介画像を自動補完しました: ${storagePath}`)
    return [storagePath]
  } catch (e) {
    console.warn(
      'ゲーム紹介画像の自動補完に失敗しました(紹介画像なしで登録を続行):',
      e instanceof Error ? e.message : e
    )
    return []
  }
}
