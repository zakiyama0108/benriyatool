import { supabase } from '../../lib/supabaseClient'

export type FeedbackInput = {
  articleDate: string // Topic.id 紐付け先の記事日付
  topicId: string // Topic.id
  comment: string // 自由記述のフィードバック内容
}

// テスト・動作確認による投稿かどうかを判定する。life-money-sim/lib/saveResult.tsの
// isTestDataと同一ロジックを踏襲する(仕様: design.md「フィードバック保存処理」、
// tasks.md Task8。アプリごとにlib/を独立させる規約のため、実装をコピーして保持する)
export function isTestData(): boolean {
  if (process.env.NODE_ENV === 'development') return true
  return new URLSearchParams(window.location.search).get('test') === '1'
}

// フィードバックをai_dev_digest_feedbackテーブルへ保存する(仕様: requirements.md#運営者向け
// フィードバック-6、requirements.md#フィードバックの保存・権限-3)。
// 既存のsaveResult系(分析用ベストエフォート)と異なり、運営者が能動的に書いた自由記述であるため
// FeedbackForm側で失敗を可視化できるよう、成功/失敗を真偽値で返す(design.md「フィードバックを
// 送信する処理」手順5)
export async function saveFeedback(input: FeedbackInput): Promise<boolean> {
  try {
    const { error } = await supabase.from('ai_dev_digest_feedback').insert({
      article_date: input.articleDate,
      topic_id: input.topicId,
      comment: input.comment,
      is_test: isTestData(),
    })
    return !error
  } catch {
    return false
  }
}
