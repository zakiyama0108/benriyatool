import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DiagramView from '../../../app/ai-dev-digest/components/DiagramView'

// mermaidパッケージ(クライアント側でDOM/Canvasの重いレイアウト計算を行う)をモックし、
// 「DiagramViewがmermaid.renderをdiagram.codeで呼び出し、返ってきたSVGをコンテナに差し込む」という
// 責務のみを検証する(実際のMermaid記法の構文解析はmermaid本体の責務であり、design.md「要約を書く処理」
// 手順13で構文検証はしないと明記されている通りこのコンポーネントの関心外。news-digestのDiagramViewテストと同じ内容)
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

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-14、specs/ai-dev-digest/article-detail/design.md#コンポーネント設計-DiagramView
describe('図解の表示(DiagramView) - diagramの形式(null/undefined/mermaid)に応じて表示を切り替える', () => {
  it('diagramがnullのとき、何も描画されないこと', () => {
    const { container } = render(<DiagramView diagram={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('diagramが未指定(undefined)のとき、何も描画されないこと(この機能追加前の記事データとの後方互換)', () => {
    const { container } = render(<DiagramView diagram={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('diagramが{type: "mermaid", code}のとき、Mermaidライブラリのrenderにcodeが渡り、返ってきたSVGが描画されること', async () => {
    render(<DiagramView diagram={{ type: 'mermaid', code: 'flowchart LR\nA-->B' }} />)
    await waitFor(() => expect(renderMock).toHaveBeenCalledWith(expect.any(String), 'flowchart LR\nA-->B'))
    await waitFor(() => expect(screen.getByTestId('rendered-mermaid-svg')).toBeTruthy())
  })
})
