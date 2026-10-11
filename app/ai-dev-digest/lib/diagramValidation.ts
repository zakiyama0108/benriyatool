// エージェントが生成する図解データの妥当性検証(仕様: requirements.md#図解-17、
// design.md「要約を書く処理」手順13。news-digestと同じロジック)。エージェントの応答はまだNano Bananaによる
// 画像取得前の生の形式(type: 'image'の場合はpathではなくpromptキーを持つ)のため、最終的な記事データの
// Diagram型(app/ai-dev-digest/lib/types.ts)とは異なる形を検証する。
// scripts/ai-dev-digest/generate-content.ts(TDD対象外)が、この判定結果を使って
// type: 'mermaid'はそのまま保存・type: 'image'はgenerateDiagram.tsへの引き渡しを振り分ける

export type AgentDiagram = { type: 'mermaid'; code: string } | { type: 'image'; prompt: string } | null

// diagramがnull、または{type:'mermaid', code}/{type:'image', prompt}のいずれかで
// code/promptが空文字でないことを確認する。それ以外(未知のtype・必須キー欠落・空文字)は不正とする
export function isValidAgentDiagram(value: unknown): value is AgentDiagram {
  if (value === null) return true
  if (typeof value !== 'object') return false

  const record = value as Record<string, unknown>
  if (record.type === 'mermaid') {
    return typeof record.code === 'string' && record.code.trim() !== ''
  }
  if (record.type === 'image') {
    return typeof record.prompt === 'string' && record.prompt.trim() !== ''
  }
  return false
}
