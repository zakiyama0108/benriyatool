// エージェントが生成する図解データの妥当性検証(仕様: requirements.md#図解-6、
// design.md「見出し・固定3観点を書く処理」手順12)。Mermaid図のみを図解として扱う(2026-10改定: 画像による
// 図解(AI画像生成→コードでのアイコン図SVG描画)も試みたが、いずれも求める品質を満たせなかった
// ため、画像による図解は行わないことにした)

export type AgentDiagram = { type: 'mermaid'; code: string } | null

// diagramがnull、または{type:'mermaid', code}でcodeが空文字でないことを確認する。
// それ以外(未知のtype・必須キー欠落・空文字)は不正とする
export function isValidAgentDiagram(value: unknown): value is AgentDiagram {
  if (value === null) return true
  if (typeof value !== 'object') return false

  const record = value as Record<string, unknown>
  if (record.type === 'mermaid') {
    return typeof record.code === 'string' && record.code.trim() !== ''
  }
  return false
}
