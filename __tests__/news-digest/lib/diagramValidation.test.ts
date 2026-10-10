import { describe, it, expect } from 'vitest'
import { isValidAgentDiagram } from '../../../app/news-digest/lib/diagramValidation'

// 仕様: specs/news-digest/content-generation/design.md#図解を生成する処理(エージェントの推論 + 決定的なコード)
describe('エージェントが返す図解データの妥当性検証 - 観点ごとのdiagramがnull・mermaid・imageのいずれかの正しい形か確認する', () => {
  it('diagramがnullのとき、有効と判定されること(図解が不要な観点)', () => {
    expect(isValidAgentDiagram(null)).toBe(true)
  })

  it('{type: "mermaid", code: 非空文字}のとき、有効と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'mermaid', code: 'flowchart LR\nA-->B' })).toBe(true)
  })

  it('{type: "image", prompt: 非空文字}のとき、有効と判定されること(promptは後続処理がNano Bananaへ渡す生成指示)', () => {
    expect(isValidAgentDiagram({ type: 'image', prompt: '保育施設の見取り図を描いたイラスト' })).toBe(true)
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
