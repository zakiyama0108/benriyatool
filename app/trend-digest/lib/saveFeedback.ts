import { supabase } from '../../lib/supabaseClient'

export type FeedbackInput = {
  articleId: string // 対象記事のArticle.id
  topicId: string // Topic.id
  comment: string // 自由記述のフィードバック内容
}

// テスト・動作確認による投稿かどうかを判定する。ai-dev-digest/lib/saveFeedback.tsのisTestDataと
// 同一ロジックを踏襲する(仕様: design.md「フィードバックを送信する処理」、tasks.md Task6。
// アプリごとにlib/を独立させる規約のため、実装をコピーして保持する)
export function isTestData(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  return new URLSearchParams(window.location.search).get('test') === '1'
}

// フィードバックをtrend_digest_feedbackテーブルへ保存する(仕様: requirements.md#運営者向け
// フィードバック-7、requirements.md#フィードバックの保存・権限-3)。運営者が能動的に書いた
// 自由記述であるため、FeedbackForm側で失敗を可視化できるよう成功/失敗を真偽値で返す
// (design.md「フィードバックを送信する処理」手順5)
export async function saveFeedback(input: FeedbackInput): Promise<boolean> {
  try {
    const { error } = await supabase.from('trend_digest_feedback').insert({
      article_id: input.articleId,
      topic_id: input.topicId,
      comment: input.comment,
      is_test: isTestData(),
    })
    return !error
  } catch {
    return false
  }
}
