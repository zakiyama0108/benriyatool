import { describe, it, expect } from 'vitest'
import { isValidAgentDiagram } from '../../../app/ai-dev-digest/lib/diagramValidation'

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#図解-17、specs/ai-dev-digest/content-generation/design.md#要約を書く処理(エージェントの推論)
describe('エージェントが返す図解データの妥当性検証 - 観点ごとのdiagramがnull・mermaid・imageのいずれかの正しい形か確認する', () => {
  it('diagramがnullのとき、有効と判定されること(図解が不要な観点)', () => {
    expect(isValidAgentDiagram(null)).toBe(true)
  })

  it('{type: "mermaid", code: 非空文字}のとき、有効と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'mermaid', code: 'flowchart LR\nA-->B' })).toBe(true)
  })

  it('{type: "image", prompt: 非空文字}のとき、有効と判定されること(promptは後続処理がCloudflare Workers AIへ渡す生成指示)', () => {
    expect(isValidAgentDiagram({ type: 'image', prompt: 'AIがコードを書く様子を表したイラスト' })).toBe(true)
  })

  it('type: "mermaid"なのにcodeが空文字のとき、不正と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'mermaid', code: '' })).toBe(false)
  })

  it('type: "mermaid"なのにcodeが空白文字のみのとき、不正と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'mermaid', code: '   ' })).toBe(false)
  })

  it('type: "image"なのにpromptが空文字のとき、不正と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'image', prompt: '' })).toBe(false)
  })

  it('typeが未定義の値("chart"等)のとき、不正と判定されること', () => {
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
