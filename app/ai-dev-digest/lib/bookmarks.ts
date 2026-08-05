import { supabase } from '../../lib/supabaseClient'

// 記事内の1トピック分の付箋の要約(BookmarkPanelのinitialBookmarkにそのまま渡す形)
export type BookmarkSummary = { id: string; memo: string }

// 付箋一覧ページで使う、対象トピックを特定できる形の付箋レコード
export type BookmarkRecord = { id: string; articleDate: string; topicId: string; memo: string }

type BookmarkRow = { id: string; article_date: string; topic_id: string; memo: string }

// 指定した記事日付の、ログイン中の本人の付箋をトピックIDをキーにしたMapで取得する
// (仕様: design.md「記事内の自分の付箋の有無をまとめて取得する処理」)。取得に失敗した場合は
// 呼び出し元(ArticleDetailView)が「すべて未付箋」として扱えるよう例外を投げる
// (life-money-sim/savedScenario.fetchScenariosと同じ方針)
export async function fetchBookmarksByArticleDate(articleDate: string): Promise<Map<string, BookmarkSummary>> {
  const { data, error } = await supabase
    .from('ai_dev_digest_bookmarks')
    .select('id, topic_id, memo')
    .eq('article_date', articleDate)
  if (error) throw new Error(`付箋の取得に失敗しました: ${error.message}`)

  const map = new Map<string, BookmarkSummary>()
  for (const row of (data ?? []) as Pick<BookmarkRow, 'id' | 'topic_id' | 'memo'>[]) {
    map.set(row.topic_id, { id: row.id, memo: row.memo })
  }
  return map
}

// ログイン中の本人の付箋を、更新日時(updated_at)の新しい順ですべて取得する
// (仕様: design.md「付箋一覧を取得して表示する処理」手順2、requirements.md#付箋した記事一覧-14)。
// 取得に失敗した場合は呼び出し元(BookmarkListView)が「0件」として扱えるよう例外を投げる
export async function fetchAllBookmarks(): Promise<BookmarkRecord[]> {
  const { data, error } = await supabase
    .from('ai_dev_digest_bookmarks')
    .select('id, article_date, topic_id, memo')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(`付箋一覧の取得に失敗しました: ${error.message}`)

  return ((data ?? []) as BookmarkRow[]).map((row) => ({
    id: row.id,
    articleDate: row.article_date,
    topicId: row.topic_id,
    memo: row.memo,
  }))
}

export type CreateBookmarkInput = { articleDate: string; topicId: string; memo: string }

// 新規に付箋を貼る(仕様: design.md「新規に付箋を貼る処理」)。成功時は新規行のidを返し、
// BookmarkPanelがそのidで以降の編集・削除操作を行えるようにする。失敗時はnullを返す
export async function createBookmark(input: CreateBookmarkInput): Promise<string | null> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return null

    const { data, error } = await supabase
      .from('ai_dev_digest_bookmarks')
      .insert({
        user_id: userData.user.id,
        article_date: input.articleDate,
        topic_id: input.topicId,
        memo: input.memo,
      })
      .select('id')
      .single()
    if (error || !data) return null
    const row: { id: string } = data
    return row.id
  } catch {
    return null
  }
}

// 既存の付箋をメモ内容で上書き保存する(仕様: design.md「付箋を編集する処理」)。
// updated_atはDBトリガーを使わずアプリ側で明示的に現在時刻をセットする
// (design.md「データベース設計」updated_at補足。既存パターンにあわせシンプルに保つ)
export async function updateBookmark(id: string, memo: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ai_dev_digest_bookmarks')
      .update({ memo, updated_at: new Date().toISOString() })
      .eq('id', id)
    return !error
  } catch {
    return false
  }
}

// 付箋を削除する(仕様: design.md「付箋を削除する処理」)
export async function deleteBookmark(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('ai_dev_digest_bookmarks').delete().eq('id', id)
    return !error
  } catch {
    return false
  }
}
