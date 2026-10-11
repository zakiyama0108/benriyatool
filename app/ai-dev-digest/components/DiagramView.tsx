'use client'

import { useEffect, useRef } from 'react'
import type { Diagram } from '../lib/types'

type Props = {
  diagram: Diagram | null | undefined
}

// 図解(観点ごとのdiagram)の表示(仕様: requirements.md#記事本文表示-14、design.md「その日の記事本文を
// 表示する処理」手順5-1。news-digestのDiagramView.tsxと同じ実装)。diagramがnull・undefined
// (この機能追加前の記事データとの後方互換)のときは何も描画しない。type: 'mermaid'はMermaidライブラリで
// 描画、type: 'image'は<img>で表示する。mermaidは静的エクスポート(output: 'export')のSSR時に
// モジュール評価でDOM/windowへアクセスしうるため、ブラウザのuseEffect内でのみ動的importする。
// 壊れたMermaid記法は構文検証をせずそのままmermaidに渡す(design.md「要約を書く処理」手順13。
// 記事全体のビルド失敗にはしない)。描画自体が失敗した場合はコンソールにのみエラーを出し、画面の表示は崩れるのみにする
let mermaidRenderIdCounter = 0

export default function DiagramView({ diagram }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(`ai-dev-digest-mermaid-${++mermaidRenderIdCounter}`)

  useEffect(() => {
    if (!diagram || diagram.type !== 'mermaid') return
    let cancelled = false

    void import('mermaid').then(async ({ default: mermaid }) => {
      try {
        mermaid.initialize({ startOnLoad: false })
        const { svg } = await mermaid.render(idRef.current, diagram.code)
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (error) {
        // eslint-disable-next-line no-console -- 原因究明用。画面は表示が崩れるのみで記事全体のビルド失敗にはしない
        console.error(`Mermaid図の描画に失敗しました: ${(error as Error).message}`)
      }
    })

    return () => {
      cancelled = true
    }
  }, [diagram])

  if (!diagram) return null

  if (diagram.type === 'image') {
    // eslint-disable-next-line @next/next/no-img-element -- ビルド時に生成済みの静的画像をそのまま表示する(next/image最適化は不要)
    return <img src={diagram.path} alt="図解" className="mt-2 w-full rounded-lg" />
  }

  return <div ref={containerRef} data-testid="mermaid-diagram" className="mt-2 overflow-x-auto" />
}
