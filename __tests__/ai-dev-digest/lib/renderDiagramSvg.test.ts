import { describe, it, expect } from 'vitest'
import { renderDiagramSvg } from '../../../app/ai-dev-digest/lib/renderDiagramSvg'
import { DIAGRAM_ICON_PATHS, isDiagramIconName } from '../../../app/ai-dev-digest/lib/diagramIcons'

// 仕様: content-generation/requirements.md#図解-17。AI画像生成ではなくコードでSVGを組み立てる
// ことで、文章(日本語ラベル)が必ず正確に表示されることを保証する
describe('renderDiagramSvg', () => {
  it('layout:stepsで、件数分のアイコン(<path>)とラベル(<text>)を含むSVGを返すこと', () => {
    const svg = renderDiagramSvg({
      layout: 'steps',
      items: [
        { icon: 'terminal', label: 'コマンド' },
        { icon: 'shield-check', label: '検査' },
        { icon: 'blocked', label: 'ブロック' },
      ],
    })
    expect(svg).toContain('<svg')
    expect(svg).toContain('コマンド')
    expect(svg).toContain('検査')
    expect(svg).toContain('ブロック')
    expect((svg.match(/<circle/g) ?? []).length).toBe(3)
  })

  it('layout:stepsで、項目間に矢印(<polygon>)が項目数-1個含まれること', () => {
    const svg = renderDiagramSvg({
      layout: 'steps',
      items: [
        { icon: 'clock', label: 'A' },
        { icon: 'chat', label: 'B' },
      ],
    })
    expect((svg.match(/<polygon/g) ?? []).length).toBe(1)
  })

  it('layout:compareで、left/rightのラベルを含み区切り線(破線)を持つSVGを返すこと', () => {
    const svg = renderDiagramSvg({
      layout: 'compare',
      left: { icon: 'clock', label: '休憩あり' },
      right: { icon: 'star', label: '質が向上' },
    })
    expect(svg).toContain('休憩あり')
    expect(svg).toContain('質が向上')
    expect(svg).toContain('stroke-dasharray')
  })

  it('ラベルがXML特殊文字を含む場合、エスケープして埋め込むこと(壊れたSVGにしない)', () => {
    const svg = renderDiagramSvg({
      layout: 'steps',
      items: [{ icon: 'terminal', label: 'A<B&C"D' }],
    })
    expect(svg).toContain('A&lt;B&amp;C&quot;D')
    expect(svg).not.toContain('A<B&C"D')
  })

  it('長いラベルは2行に折り返され、それ以上は末尾が省略記号になること', () => {
    const svg = renderDiagramSvg({
      layout: 'steps',
      items: [{ icon: 'terminal', label: 'あ'.repeat(30) }],
    })
    const textCount = (svg.match(/<text/g) ?? []).length
    expect(textCount).toBe(2)
    expect(svg).toContain('…')
  })
})

describe('diagramIcons', () => {
  it('定義済みのアイコン名はすべて1件以上のパスデータを持つこと', () => {
    for (const paths of Object.values(DIAGRAM_ICON_PATHS)) {
      expect(paths.length).toBeGreaterThan(0)
      for (const d of paths) {
        expect(typeof d).toBe('string')
        expect(d.length).toBeGreaterThan(0)
      }
    }
  })

  it('isDiagramIconNameが定義済みの名前にtrue、未定義の名前にfalseを返すこと', () => {
    expect(isDiagramIconName('terminal')).toBe(true)
    expect(isDiagramIconName('not-a-real-icon')).toBe(false)
    expect(isDiagramIconName(123)).toBe(false)
  })
})
