import { supabase } from '../../lib/supabaseClient'

// ゲームごとのコメント(仕様: comment/design.md「データベース設計」)。
// author_nameは公開表示用に投稿時のセッション表示名を非正規化して保存した値
// (anonはauth.usersを読めないため、一覧表示で表示名を都度引けない)。
export type Comment = {
  id: string
  gameId: string
  userId: string
  authorName: string
  body: string
  createdAt: string
  updatedAt: string
}

type CommentRow = {
  id: string
  game_id: string
  user_id: string
  author_name: string
  body: string
  created_at: string
  updated_at: string
}

const COMMENT_COLUMNS = 'id, game_id, user_id, author_name, body, created_at, updated_at'

// 本文の文字数上限(comment/design.md「バリデーション」で2000に確定。DB側のCHECK制約と揃える)
const MAX_BODY_LENGTH = 2000

function mapRow(row: CommentRow): Comment {
  return {
    id: row.id,
    gameId: row.game_id,
    userId: row.user_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// 本文をトリムし、投稿・編集で共通の検証を行う(comment/design.md「バリデーション」)。
// 空文字・空白のみは不可、トリム後の文字数上限を超えるものも不可。妥当なら保存用のトリム済み本文を返す。
function normalizeBody(body: string): string | null {
  const trimmed = body.trim()
  if (trimmed === '') return null
  if (trimmed.length > MAX_BODY_LENGTH) return null
  return trimmed
}

// 対象ゲームのコメントを投稿日時の昇順(古い順)で取得する(comment/design.md「コメント一覧を取得して表示する処理」)。
// 閲覧はログイン不要(誰でもSELECT)。取得に失敗した場合は、コメント欄をエラー表示に切り替えられるよう例外を投げる
// (お気に入りのように握りつぶさない。design.md#エラーハンドリング)。
export async function fetchComments(gameId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('board_game_rules_comments')
    .select(COMMENT_COLUMNS)
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(`コメントの取得に失敗しました: ${error.message}`)
  return ((data ?? []) as CommentRow[]).map(mapRow)
}

// コメントを投稿する(comment/design.md「コメントを投稿する処理」)。ログイン中の本人のuser_idと、
// セッション由来の表示名(Google OIDCの氏名。無ければメールで代替)をauthor_nameとして保存する。
// 検証を満たさない/未ログイン/失敗時はnullを返し、成功時は作成されたコメントを返す(呼び出し元が一覧へ即時反映できる)。
export async function createComment(gameId: string, body: string): Promise<Comment | null> {
  const normalized = normalizeBody(body)
  if (normalized === null) return null

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    const user = userData?.user
    if (userError || !user) return null

    // 表示名はGoogle OIDCの氏名を優先し、無ければメールで代替する(LoginStatusの表示名と同じ導出)
    const authorName = (user.user_metadata?.full_name as string | undefined) || user.email || ''

    const inserted = await supabase
      .from('board_game_rules_comments')
      .insert({ game_id: gameId, user_id: user.id, author_name: authorName, body: normalized })
      .select()
      .single()
    if (inserted.error || !inserted.data) {
      // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)。本文の中身は出さない
      console.error('コメントの投稿に失敗しました', { gameId })
      return null
    }
    return mapRow(inserted.data as CommentRow)
  } catch {
    return null
  }
}

// 自分のコメント1行の本文を上書き更新する(comment/design.md「コメントを編集する処理」)。
// 投稿と同じ検証を行い、新規行は作らずUPDATEする。編集できるのは本人のみ(RLSで担保)。
// updated_atはDBトリガーを使わずアプリで現在時刻をセットする(design.md「データベース設計」)。
export async function updateComment(id: string, body: string): Promise<boolean> {
  const normalized = normalizeBody(body)
  if (normalized === null) return false

  try {
    const { error } = await supabase
      .from('board_game_rules_comments')
      .update({ body: normalized, updated_at: new Date().toISOString() })
      .eq('id', id)
    return !error
  } catch {
    return false
  }
}

// コメントを削除する(comment/design.md「コメントを削除する処理」)。本人または運営者が削除できる。
// 実際の可否はRLS(本人+運営者)で担保するため、ここではid指定でDELETEするだけでよい。
export async function deleteComment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('board_game_rules_comments').delete().eq('id', id)
    return !error
  } catch {
    return false
  }
}
