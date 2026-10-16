import { describe, it, expect } from 'vitest'
import { isValidAgentDiagram } from '../../../app/trend-digest/lib/diagramValidation'

// 仕様: specs/trend-digest/content-generation/requirements.md#図解-7、specs/trend-digest/content-generation/design.md#見出し・固定3観点を書く処理(エージェントの推論)
describe('エージェントが返す図解データの妥当性検証 - 観点ごとのdiagramがnull・mermaidのいずれかの正しい形か確認する', () => {
  it('diagramがnullのとき、有効と判定されること(図解が不要な観点)', () => {
    expect(isValidAgentDiagram(null)).toBe(true)
  })

  it('{type: "mermaid", code: 非空文字}のとき、有効と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'mermaid', code: 'flowchart LR\nA-->B' })).toBe(true)
  })

  it('type: "mermaid"なのにcodeが空文字のとき、不正と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'mermaid', code: '' })).toBe(false)
  })

  it('type: "mermaid"なのにcodeが空白文字のみのとき、不正と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'mermaid', code: '   ' })).toBe(false)
  })

  it('typeが未定義の値("image"・"chart"等)のとき、不正と判定されること(画像による図解は廃止したため)', () => {
    expect(isValidAgentDiagram({ type: 'image', layout: 'steps', items: [] })).toBe(false)
    expect(isValidAgentDiagram({ type: 'chart', code: 'x' })).toBe(false)
  })

  it('オブジェクトではない値(文字列・数値)のとき、不正と判定されること', () => {
    expect(isValidAgentDiagram('mermaid')).toBe(false)
    expect(isValidAgentDiagram(1)).toBe(false)
  })

  it('undefinedのとき、不正と判定されること(nullとundefinedを区別する。欠落は想定外の応答形式のため)', () => {
    expect(isValidAgentDiagram(undefined)).toBe(false)
  })
})
