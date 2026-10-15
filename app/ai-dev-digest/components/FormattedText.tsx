'use client'

import { useState } from 'react'
import { parseFormattedText, type InlineNode } from '../lib/parseFormattedText'

type Props = {
  text: string
}

function InlineNodes({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === 'code') {
          return (
            <code key={i} className="rounded bg-gray-100 px-1 py-0.5 text-[0.9em] text-teal-700">
              {node.text}
            </code>
          )
        }
        if (node.type === 'link') {
          return (
            <a key={i} href={node.href} target="_blank" rel="noopener noreferrer" className="underline text-teal-600">
              {node.text}
            </a>
          )
        }
        return node.text
      })}
    </>
  )
}

// コードブロックの右上にコピー操作を置く(仕様: content-generation/requirements.md#要約-12。
// 活用法でコピペして試せる設定・コマンドを、そのままコピーできるようにするため)
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // クリップボードAPIが使えない環境(非対応ブラウザ・権限なし等)では何もしない。コード自体は選択してコピー可能
    }
  }

  return (
    <div className="relative mt-1.5">
      <pre className="overflow-x-auto rounded-lg bg-gray-800 p-3 text-xs leading-relaxed text-gray-100">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded bg-gray-700 px-2 py-1 text-[11px] text-gray-100 hover:bg-gray-600"
      >
        {copied ? 'コピーしました' : 'コピー'}
      </button>
    </div>
  )
}

// 観点の詳細文(detail)を簡易Markdown記法(段落・番号付きリスト・箇条書き・コードブロック)として
// 描画する(仕様: article-detail/requirements.md#記事本文表示-15)。活用法の手順を見やすい段落・
// リストにし、コピペして試せるコマンド・設定はコードブロックとして示すための表示専用コンポーネント
export default function FormattedText({ text }: Props) {
  const blocks = parseFormattedText(text)

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        if (block.type === 'code') return <CodeBlock key={i} code={block.code} />
        if (block.type === 'orderedList') {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-gray-600">
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineNodes nodes={item} />
                </li>
              ))}
            </ol>
          )
        }
        if (block.type === 'unorderedList') {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-600">
              {block.items.map((item, j) => (
                <li key={j}>
                  <InlineNodes nodes={item} />
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-gray-600">
            <InlineNodes nodes={block.inline} />
          </p>
        )
      })}
    </div>
  )
}
