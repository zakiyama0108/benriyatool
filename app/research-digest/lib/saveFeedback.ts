import { supabase } from '../../lib/supabaseClient'

export type FeedbackInput = {
  articleId: string // 対象記事のArticle.id
  findingId: string // Finding.id
  comment: string // 自由記述のフィードバック内容
}

// テスト・動作確認による投稿かどうかを判定する。future-digest/lib/saveFeedback.tsのisTestDataと
// 同一ロジック(アプリごとにlib/を独立させる規約のためコピーして保持する)
export function isTestData(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  return new URLSearchParams(window.location.search).get('test') === '1'
}

// フィードバックをresearch_digest_feedbackテーブルへ保存する(仕様: requirements.md#運営者向け
// フィードバック-12、requirements.md#フィードバックの保存・権限-2)。FeedbackForm側で失敗を
// 可視化できるよう成功/失敗を真偽値で返す(design.md「フィードバックを送信する処理」手順2〜4)
export async function saveFeedback(input: FeedbackInput): Promise<boolean> {
  try {
    const { error } = await supabase.from('research_digest_feedback').insert({
      article_id: input.articleId,
      finding_id: input.findingId,
      comment: input.comment,
      is_test: isTestData(),
    })
    return !error
  } catch {
    return false
  }
}
