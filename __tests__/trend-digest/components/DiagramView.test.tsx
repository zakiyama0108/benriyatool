import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DiagramView from '../../../app/trend-digest/components/DiagramView'

// mermaidパッケージ(クライアント側でDOM/Canvasの重いレイアウト計算を行う)をモックし、
// 「DiagramViewがmermaid.renderをdiagram.codeで呼び出し、返ってきたSVGをコンテナに差し込む」という
// 責務のみを検証する(実際のMermaid記法の構文解析はmermaid本体の責務であり、design.md「見出し・
// 固定3観点を書く処理」手順12で「生成時点での構文検証はしない」と明記されている通りこのコンポーネントの関心外)
const { renderMock, initializeMock } = vi.hoisted(() => ({
  renderMock: vi.fn(),
  initializeMock: vi.fn(),
}))
vi.mock('mermaid', () => ({
  default: {
    initialize: initializeMock,
    render: renderMock,
  },
}))

beforeEach(() => {
  renderMock.mockReset()
  initializeMock.mockReset()
  renderMock.mockResolvedValue({ svg: '<svg data-testid="rendered-mermaid-svg"></svg>' })
})

// 仕様: specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-20、specs/trend-digest/article-detail/design.md#その回の記事本文を表示する処理
describe('図解の表示(DiagramView) - diagramの形式(null/mermaid/image)に応じて表示を切り替える', () => {
  it('diagramがnullのとき、何も描画されないこと', () => {
    const { container } = render(<DiagramView diagram={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('diagramが未指定(undefined)のとき、何も描画されないこと(図解が生成されていない観点)', () => {
    const { container } = render(<DiagramView diagram={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('diagramが{type: "mermaid", code}のとき、Mermaidライブラリのrenderにcodeが渡り、返ってきたSVGが描画されること', async () => {
    render(<DiagramView diagram={{ type: 'mermaid', code: 'flowchart LR\nA-->B' }} />)
    await waitFor(() => expect(renderMock).toHaveBeenCalledWith(expect.any(String), 'flowchart LR\nA-->B'))
    await waitFor(() => expect(screen.getByTestId('rendered-mermaid-svg')).toBeTruthy())
  })

  it('diagramが{type: "image", path}のとき、<img>のsrcがpathと一致すること', () => {
    render(<DiagramView diagram={{ type: 'image', path: 'content/trend-digest/articles/images/2026-09-15-topic-1-fact.png' }} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBe('content/trend-digest/articles/images/2026-09-15-topic-1-fact.png')
  })
})
