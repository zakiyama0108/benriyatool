'use client'

import { useEffect, useRef } from 'react'
import type { Diagram } from '../lib/types'

type Props = {
  diagram: Diagram | null | undefined
}

// 図解(観点ごとのdiagram)の表示(仕様: requirements.md#記事本文表示-13、design.md「その週の記事本文を
// 表示する処理」手順5-1)。diagramがnull・undefined(この機能追加前の記事データとの後方互換)のときは
// 何も描画しない。Mermaid図のみをMermaidライブラリで描画する(2026-10改定: 画像による図解は廃止した)。
// 静的エクスポート(output: 'export')のSSR時にモジュール評価でDOM/windowへアクセスしうるため、
// ブラウザのuseEffect内でのみ動的importする(Next.js固有の挙動差分としてnextjs-notes.mdに追記)。
// 壊れたMermaid記法は構文検証をせずそのままmermaidに渡す(design.md「図解を生成する処理」手順1。
// 記事全体のビルド失敗にはしない)。描画自体が失敗した場合はコンソールにのみエラーを出し、画面の表示は崩れるのみにする
let mermaidRenderIdCounter = 0

export default function DiagramView({ diagram }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(`news-digest-mermaid-${++mermaidRenderIdCounter}`)

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

  return <div ref={containerRef} data-testid="mermaid-diagram" className="mt-2 overflow-x-auto" />
}
