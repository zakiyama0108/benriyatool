// 対象5ワークフローの名称からアプリ名(URLパス)を導出するための対応表
// (仕様: specs/digest-failure-notification/requirements.md#失敗検知・通知-1、
// design.md「通知メッセージを組み立てて送信する処理」手順1)。
export const WORKFLOW_APP_NAMES: Record<string, string> = {
  'AI駆動開発ダイジェスト 日次記事公開': 'ai-dev-digest',
  '重要ニュース週刊ダイジェスト 週次記事公開': 'news-digest',
  'トレンドダイジェスト 週次記事公開': 'trend-digest',
  '研究発見 週次記事公開': 'research-digest',
  '週刊未来予測 週次記事公開': 'future-digest',
}
