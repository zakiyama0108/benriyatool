import type { SourceDirectoryRow } from '../../../lib/buildSourceDirectory'

type Props = {
  rows: SourceDirectoryRow[]
}

// URLがhttp/https以外のスキームを弾く(design.md「セキュリティ」。javascript:等のリンクが
// 生成されないようにする。article-detail/design.mdのsourceUrlと同じ扱い)
function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// ジャンルごとの情報源・採用基準を1枚の表として描画する(design.md「画面設計」)。
// propsから表を描くだけの表示コンポーネントで、データの組み立ては行わない。
// 表示専用で、入力欄・保存ボタン等の編集手段は一切持たない(requirements.md#表示する内容の範囲-5)
export default function SourceTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="px-3 py-2">ジャンル</th>
            <th className="px-3 py-2">編</th>
            <th className="px-3 py-2">選定方式</th>
            <th className="px-3 py-2">採用基準</th>
            <th className="px-3 py-2">情報源</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.genreLabel} className="border-b border-gray-100 align-top">
              <td className="px-3 py-2 font-medium">{row.genreLabel}</td>
              <td className="px-3 py-2 text-gray-500">{row.editionLabel}</td>
              <td className="px-3 py-2">{row.methodLabel}</td>
              <td className="px-3 py-2">{row.criteriaText}</td>
              <td className="px-3 py-2">
                {row.sources.length > 0 && (
                  <ul className="space-y-1">
                    {row.sources.map((source) => (
                      <li key={source.url}>
                        {isHttpUrl(source.url) ? (
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">
                            {source.name}
                          </a>
                        ) : (
                          source.name
                        )}
                        <span className="ml-1 text-gray-400">({source.regionLabel})</span>
                      </li>
                    ))}
                  </ul>
                )}
                {row.searchHints.length > 0 && (
                  <p className="mt-1 text-gray-500">検索の手がかり: {row.searchHints.join('、')}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
