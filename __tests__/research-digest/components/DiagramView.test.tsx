import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DiagramView from '../../../app/research-digest/components/DiagramView'

// mermaidパッケージ(クライアント側でDOM/Canvasの重いレイアウト計算を行う)をモックし、
// 「DiagramViewがmermaid.renderをdiagram.codeで呼び出し、返ってきたSVGをコンテナに差し込む」という
// 責務のみを検証する(news-digestのDiagramView.test.tsxと同じ考え方)
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

// 仕様: specs/research-digest/article-detail/requirements.md#運営者向けフィードバック-15、specs/research-digest/article-detail/design.md#コンポーネント設計-DiagramView
describe('図解の表示(DiagramView) - diagramの形式(null/mermaid)に応じて表示を切り替える', () => {
  it('diagramがnullのとき、何も描画されないこと', () => {
    const { container } = render(<DiagramView diagram={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('diagramが{type: "mermaid", code}のとき、Mermaidライブラリのrenderにcodeが渡り、返ってきたSVGが描画されること', async () => {
    render(<DiagramView diagram={{ type: 'mermaid', code: 'flowchart LR\nA-->B' }} />)
    await waitFor(() => expect(renderMock).toHaveBeenCalledWith(expect.any(String), 'flowchart LR\nA-->B'))
    await waitFor(() => expect(screen.getByTestId('rendered-mermaid-svg')).toBeTruthy())
  })
})
