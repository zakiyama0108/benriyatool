// エージェントが生成する図解データの妥当性検証(仕様: content-generation/requirements.md#図解-6、
// content-generation/design.md「見出し・固定4観点を書く処理」手順13)。エージェントの応答はまだ
// Nano Bananaによる画像取得前の生の形式(type: 'image'の場合はpathではなくpromptキーを持つ)のため、
// 最終的な記事データのDiagram型(app/research-digest/lib/types.ts)とは異なる形を検証する
// (news-digestのdiagramValidation.tsと同じロジック)。
// scripts/research-digest/generate-content.ts(TDD対象外)が、この判定結果を使って
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
