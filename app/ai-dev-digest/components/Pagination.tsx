import Link from 'next/link'

type Props = {
  currentPage: number
  totalPages: number
}

// 前へ/次へ・現在ページ/総ページ数の表示(仕様: design.md「画面設計」)。
// totalPages<=1(記事0件・1ページのみ)では何も描画しない
function pageHref(page: number): string {
  return page <= 1 ? '/ai-dev-digest' : `/ai-dev-digest/page/${page}`
}

export default function Pagination({ currentPage, totalPages }: Props) {
  if (totalPages <= 1) return null

  return (
    <nav className="flex items-center justify-center gap-4 text-sm text-gray-500">
      {currentPage > 1 && (
        <Link href={pageHref(currentPage - 1)} className="font-semibold text-teal-600 hover:underline">
          前へ
        </Link>
      )}
      <span>{`${currentPage} / ${totalPages}`}</span>
      {currentPage < totalPages && (
        <Link href={pageHref(currentPage + 1)} className="font-semibold text-teal-600 hover:underline">
          次へ
        </Link>
      )}
    </nav>
  )
}
