import { supabase } from '../../../lib/supabaseClient'
import type { Genre } from '../../lib/genres'

// 登録依頼1件ごとの進行状態(仕様: game-registration/design.md「データベース設計」status列、
// admin/design.md「登録実行・下書きレビューの処理」の状態遷移図)
export type GameRequestStatus = 'pending' | 'queued' | 'running' | 'draft' | 'published' | 'failed'

// ローカル処理が生成する下書き(GameRegistrationInputと同形。photo_paths・intro_photo_pathsは含まない。
// 仕様: game-registration/design.md「データベース設計」draft_content列、
// scripts/board-game-rules/registerGame.ts の GameRegistrationInput)
export type GameDraftContent = {
  name: string
  minPlayers: number
  maxPlayers: number
  minMinutes: number
  maxMinutes: number
  genres: string[]
  minAge?: number | null
  difficulty?: string | null
  publisher?: string | null
  author?: string | null
  hasJapaneseRules?: boolean | null
  awards?: string | null
  releaseYear?: number | null
  rulesSimple: string
  rulesDetailed: { key: string; body: string }[]
}

// 再調整の要望履歴の1件(仕様: admin/design.md「登録実行・下書きレビューの処理」手順6)。
// noteは初回生成時はnull、再調整時は消費したrevision_note
export type RevisionHistoryEntry = {
  round: number
  note: string | null
  created_at: string
}

export type GameRequest = {
  id: string
  photoPaths: string[]
  // ゲーム紹介画像(公開Storage)のパス。順序付きで先頭がメイン画像候補。0枚(自動補完対象)〜20枚
  // (仕様: admin/requirements.md#ゲーム紹介画像の確認・自動補完-11)
  introPhotoPaths: string[]
  name: string | null
  minPlayers: number | null
  maxPlayers: number | null
  minMinutes: number | null
  maxMinutes: number | null
  genres: Genre[]
  minAge: number | null
  difficulty: string | null
  publisher: string | null
  author: string | null
  hasJapaneseRules: boolean | null
  awards: string | null
  releaseYear: number | null
  createdAt: string
  processedAt: string | null
  // 登録実行・下書きレビュー用の状態(仕様: admin/design.md「登録実行・下書きレビューの処理」)
  status: GameRequestStatus
  draftContent: GameDraftContent | null
  revisionNote: string | null
  revisionRound: number
  revisionHistory: RevisionHistoryEntry[]
  errorMessage: string | null
  publishedGameId: string | null
}

type GameRequestRow = {
  id: string
  photo_paths: string[]
  intro_photo_paths: string[]
  name: string | null
  min_players: number | null
  max_players: number | null
  min_minutes: number | null
  max_minutes: number | null
  genres: string[]
  min_age: number | null
  difficulty: string | null
  publisher: string | null
  author: string | null
  has_japanese_rules: boolean | null
  awards: string | null
  release_year: number | null
  created_at: string
  processed_at: string | null
  status: GameRequestStatus | null
  draft_content: GameDraftContent | null
  revision_note: string | null
  revision_round: number | null
  revision_history: RevisionHistoryEntry[] | null
  error_message: string | null
  published_game_id: string | null
}

function mapRow(row: GameRequestRow): GameRequest {
  return {
    id: row.id,
    photoPaths: row.photo_paths,
    introPhotoPaths: Array.isArray(row.intro_photo_paths) ? row.intro_photo_paths : [],
    name: row.name,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    minMinutes: row.min_minutes,
    maxMinutes: row.max_minutes,
    genres: row.genres as Genre[],
    minAge: row.min_age,
    difficulty: row.difficulty,
    publisher: row.publisher,
    author: row.author,
    hasJapaneseRules: row.has_japanese_rules,
    awards: row.awards,
    releaseYear: row.release_year,
    createdAt: row.created_at,
    processedAt: row.processed_at,
    // status列は既存依頼(カラム追加前)ではnullになりうるため、未設定は'pending'に倒す
    status: row.status ?? 'pending',
    draftContent: row.draft_content ?? null,
    revisionNote: row.revision_note ?? null,
    revisionRound: row.revision_round ?? 0,
    revisionHistory: Array.isArray(row.revision_history) ? row.revision_history : [],
    errorMessage: row.error_message ?? null,
    publishedGameId: row.published_game_id ?? null,
  }
}

// Web側の操作結果。失敗時は運営者に見せるエラー文言を持つ(design.md「エラーハンドリング」)
export type RequestMutationResult = { ok: boolean; error?: string }

// 登録依頼を未処理優先・次いで新しい順に取得する(仕様: admin/design.md「登録依頼を確認する処理」)。
// 取得に失敗した場合は例外を投げ、呼び出し元(画面)でエラー表示に切り替える
export async function fetchGameRequests(): Promise<GameRequest[]> {
  const { data, error } = await supabase
    .from('board_game_rules_game_requests')
    .select('*')
    .order('processed_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
  if (error) {
    throw new Error(`登録依頼一覧の取得に失敗しました: ${error.message}`)
  }
  return ((data ?? []) as GameRequestRow[]).map(mapRow)
}

// 不要な登録依頼(スパム・重複・情報不足など)を削除する(仕様: admin/design.md「登録依頼を削除する処理」)
export async function deleteGameRequest(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('board_game_rules_game_requests').delete().eq('id', id)
    return !error
  } catch {
    return false
  }
}

// 「登録実行」で status を queued にして、ローカルの定期処理(processRegistrationQueue.ts)の
// 処理対象にする(仕様: admin/design.md「登録実行・下書きレビューの処理」手順1・7)。
// Web側はSupabase上の状態更新にとどまり、写真解析・生成はローカル環境で行われる
// (admin/requirements.md#登録実行のローカル処理起動-9)。
// 状態遷移図(design.md)のとおり pending / failed からのみ実行できる(不正な状態からの起動を防ぐ)。
export async function triggerRegistration(
  id: string,
  currentStatus: GameRequestStatus
): Promise<RequestMutationResult> {
  if (currentStatus !== 'pending' && currentStatus !== 'failed') {
    return { ok: false, error: `この状態(${currentStatus})からは登録実行できません` }
  }
  try {
    const { error } = await supabase
      .from('board_game_rules_game_requests')
      .update({ status: 'queued' })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// 「再調整を依頼」で要望テキストを revision_note にセットし status を queued に戻す
// (仕様: admin/design.md「登録実行・下書きレビューの処理」手順5)。
// draft_content・revision_round・revision_history はここでは変更しない(ローカル処理が完了後に更新する)。
// 状態遷移図のとおり draft からのみ実行できる。
export async function requestRevision(
  id: string,
  note: string,
  currentStatus: GameRequestStatus
): Promise<RequestMutationResult> {
  if (currentStatus !== 'draft') {
    return { ok: false, error: `この状態(${currentStatus})からは再調整を依頼できません` }
  }
  try {
    const { error } = await supabase
      .from('board_game_rules_game_requests')
      .update({ revision_note: note, status: 'queued' })
      .eq('id', id)
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// 文字数上限CHECK違反時に、どの項目が長すぎるかが分かる文言へ変換する
// (仕様: admin/design.md「エラーハンドリング」。下書き側には上限CHECKがなく公開時に初めて顕在化する)
function describePublishError(message: string): string {
  if (message.includes('rules_simple')) {
    return '簡単版ルールが文字数上限(4000字)を超えています。「再調整を依頼」で短くするよう伝えてください。'
  }
  if (message.includes('rules_detailed')) {
    return '詳しい版ルールが文字数上限(40000字)を超えています。「再調整を依頼」で短くするよう伝えてください。'
  }
  return `ゲームの登録に失敗しました: ${message}`
}

// 「公開する」で下書きの内容を board_game_rules_games へINSERTし、対応する依頼を公開済みにする
// (仕様: admin/design.md「登録実行・下書きレビューの処理」手順4、admin/requirements.md#登録実行・下書きレビュー-19)。
// draft_content(photo_paths・intro_photo_pathsを含まない)に、依頼行が持つ photo_paths・intro_photo_paths を
// 合わせてINSERTする。INSERT成功後の依頼UPDATEが失敗して再度押されたときの重複INSERTを避けるため、
// 依頼に published_game_id が既にあれば新規INSERTせず後段UPDATEのみを冪等に再実行する(手順4)。
// さらに、INSERT直後にまず published_game_id だけを単独UPDATEで永続化してから公開済み化のUPDATEを行う。
// これにより後段UPDATEが失敗しても再INSERT防止の判定材料(published_game_id)が必ずDBに残る。
export async function publishDraft(
  request: GameRequest
): Promise<RequestMutationResult & { gameId?: string }> {
  const draft = request.draftContent
  if (!draft) return { ok: false, error: '下書きがありません' }
  try {
    let gameId = request.publishedGameId
    if (!gameId) {
      const { data, error } = await supabase
        .from('board_game_rules_games')
        .insert({
          name: draft.name,
          min_players: draft.minPlayers,
          max_players: draft.maxPlayers,
          min_minutes: draft.minMinutes,
          max_minutes: draft.maxMinutes,
          genres: draft.genres,
          min_age: draft.minAge ?? null,
          difficulty: draft.difficulty ?? null,
          publisher: draft.publisher ?? null,
          author: draft.author ?? null,
          has_japanese_rules: draft.hasJapaneseRules ?? null,
          awards: draft.awards ?? null,
          release_year: draft.releaseYear ?? null,
          rules_simple: draft.rulesSimple,
          rules_detailed: draft.rulesDetailed,
          photo_paths: request.photoPaths,
          intro_photo_paths: request.introPhotoPaths,
        })
        .select('id')
        .single()
      if (error || !data) {
        return { ok: false, error: describePublishError(error?.message ?? 'ゲームの登録に失敗しました') }
      }
      const inserted: { id: string } = data
      gameId = inserted.id
      // INSERT直後に published_game_id だけを先に永続化する。続く公開済み化UPDATEが失敗しても、
      // 次回押下時にこの値を検出して再INSERTを避けられる(design.md「登録実行・下書きレビューの処理」手順4)
      const { error: linkError } = await supabase
        .from('board_game_rules_game_requests')
        .update({ published_game_id: gameId })
        .eq('id', request.id)
      if (linkError) {
        return { ok: false, error: `依頼の更新に失敗しました: ${linkError.message}` }
      }
    }
    // 依頼を公開済みにする後段UPDATE。再押下時(published_game_id 検出でINSERTをスキップした場合)は
    // ここだけが冪等に再実行される
    const { error: updateError } = await supabase
      .from('board_game_rules_game_requests')
      .update({
        processed_at: new Date().toISOString(),
        published_game_id: gameId,
        status: 'published',
      })
      .eq('id', request.id)
    if (updateError) {
      return { ok: false, error: `依頼の更新に失敗しました: ${updateError.message}` }
    }
    return { ok: true, gameId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
