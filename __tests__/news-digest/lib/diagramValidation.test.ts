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

  it('{type: "image", layout: "steps", items: 定義済みアイコン2〜4件}のとき、有効と判定されること(itemsは後続処理がrenderDiagramSvgへ渡すデータ)', () => {
    expect(
      isValidAgentDiagram({
        type: 'image',
        layout: 'steps',
        items: [
          { icon: 'document', label: '保育施設' },
          { icon: 'check', label: '見取り図' },
        ],
      })
    ).toBe(true)
  })

  it('{type: "image", layout: "compare", left, right}のとき、有効と判定されること', () => {
    expect(
      isValidAgentDiagram({
        type: 'image',
        layout: 'compare',
        left: { icon: 'clock', label: '休憩あり' },
        right: { icon: 'star', label: '質が向上' },
      })
    ).toBe(true)
  })

  it('type: "mermaid"なのにcodeが空文字のとき、不正と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'mermaid', code: '' })).toBe(false)
  })

  it('type: "mermaid"なのにcodeが空白文字のみのとき、不正と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'mermaid', code: '   ' })).toBe(false)
  })

  it('layout:"steps"でitemsが1件のとき、不正と判定されること(2〜4件の範囲外)', () => {
    expect(isValidAgentDiagram({ type: 'image', layout: 'steps', items: [{ icon: 'document', label: 'a' }] })).toBe(false)
  })

  it('layout:"steps"でitemsが5件のとき、不正と判定されること(2〜4件の範囲外)', () => {
    const items = Array.from({ length: 5 }, () => ({ icon: 'document', label: 'a' }))
    expect(isValidAgentDiagram({ type: 'image', layout: 'steps', items })).toBe(false)
  })

  it('layout:"steps"で未定義のアイコン名が含まれるとき、不正と判定されること', () => {
    expect(
      isValidAgentDiagram({
        type: 'image',
        layout: 'steps',
        items: [
          { icon: 'document', label: 'a' },
          { icon: 'not-a-real-icon', label: 'b' },
        ],
      })
    ).toBe(false)
  })

  it('layout:"steps"でlabelが空文字のとき、不正と判定されること', () => {
    expect(
      isValidAgentDiagram({
        type: 'image',
        layout: 'steps',
        items: [
          { icon: 'document', label: '' },
          { icon: 'star', label: 'b' },
        ],
      })
    ).toBe(false)
  })

  it('layout:"compare"でrightのiconが未定義のとき、不正と判定されること', () => {
    expect(
      isValidAgentDiagram({
        type: 'image',
        layout: 'compare',
        left: { icon: 'clock', label: 'a' },
        right: { icon: 'not-a-real-icon', label: 'b' },
      })
    ).toBe(false)
  })

  it('未知のlayout値のとき、不正と判定されること', () => {
    expect(isValidAgentDiagram({ type: 'image', layout: 'radial', items: [] })).toBe(false)
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
