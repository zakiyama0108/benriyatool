import type { ReactNode } from 'react'
import { GUIDE_THEMES, type GuideTheme } from '../lib/theme'

type Column = {
  header: string
  align?: 'right'
}

type Row = {
  cells: ReactNode[]
  capped?: boolean  // 賃金日額の上限適用行。1列目にバッジを付けて注意を促す
}

type Props = {
  columns: Column[]
  rows: Row[]
  theme: GuideTheme
}

// ガイド記事の数値表。金額はHTMLテーブルで掲載する(画像化しない)方針の共通実装。
// 表が画面幅を超える場合は表自身が横スクロールし、ページ全体は横に伸びない
export default function ArticleTable({ columns, rows, theme }: Props) {
  const t = GUIDE_THEMES[theme]
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm tabular-nums">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                className={`whitespace-nowrap border-b-2 ${t.headerRule} px-2 py-2 text-xs font-semibold text-gray-500 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-b-0">
              {row.cells.map((cell, j) => (
                <td
                  key={j}
                  className={`px-2 py-2.5 ${columns[j]?.align === 'right' ? 'text-right whitespace-nowrap' : ''}`}
                >
                  {cell}
                  {row.capped && j === 0 && (
                    <span className="ml-1.5 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                      上限適用
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
