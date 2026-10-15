// エージェントが生成する図解データの妥当性検証(仕様: requirements.md#図解-12〜14、
// design.md「図解を生成する処理」)。エージェントの応答はまだSVG描画前の生の形式
// (type: 'image'の場合はpathではなくlayout/items等の構造化データを持つ)のため、最終的な記事データの
// Diagram型(app/news-digest/lib/types.ts)とは異なる形を検証する。
// scripts/news-digest/generate-content.ts(TDD対象外)が、この判定結果を使って
// type: 'mermaid'はそのまま保存・type: 'image'はrenderDiagramSvg.tsへの引き渡しを振り分ける
// (2026-10改定: 当初はtype:'image'のとき自由文のprompt文字列をAI画像生成に渡していたが、
// 文章・構図の破綻を避けられなかったため、固定アイコン名+短いラベルの構造化データに変更した)
import { isDiagramIconName, type DiagramIconName } from './diagramIcons'

export type AgentDiagramItem = { icon: unknown; label: unknown }
export type ValidatedAgentDiagramItem = { icon: DiagramIconName; label: string }

export type AgentDiagram =
  | { type: 'mermaid'; code: string }
  | { type: 'image'; layout: 'steps'; items: ValidatedAgentDiagramItem[] }
  | { type: 'image'; layout: 'compare'; left: ValidatedAgentDiagramItem; right: ValidatedAgentDiagramItem }
  | null

function isValidItem(value: unknown): value is ValidatedAgentDiagramItem {
  if (typeof value !== 'object' || value === null) return false
  const item = value as AgentDiagramItem
  return isDiagramIconName(item.icon) && typeof item.label === 'string' && item.label.trim() !== ''
}

// diagramがnull、または{type:'mermaid', code}/{type:'image', layout:'steps', items}/
// {type:'image', layout:'compare', left, right}のいずれかであることを確認する。
// - codeは空文字でないこと
// - layout:'steps'はitemsが2〜4件で、各要素のiconが定義済みのアイコン名・labelが空文字でないこと
// - layout:'compare'はleft/rightの両方が同条件を満たすこと
// それ以外(未知のtype・未知のlayout・必須キー欠落・空文字・未定義のアイコン名)は不正とする
export function isValidAgentDiagram(value: unknown): value is AgentDiagram {
  if (value === null) return true
  if (typeof value !== 'object') return false

  const record = value as Record<string, unknown>
  if (record.type === 'mermaid') {
    return typeof record.code === 'string' && record.code.trim() !== ''
  }
  if (record.type !== 'image') return false

  if (record.layout === 'steps') {
    if (!Array.isArray(record.items)) return false
    if (record.items.length < 2 || record.items.length > 4) return false
    return record.items.every(isValidItem)
  }
  if (record.layout === 'compare') {
    return isValidItem(record.left) && isValidItem(record.right)
  }
  return false
}
