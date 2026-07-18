import Link from 'next/link'

// 記事共通のパンくず。「ガイド」は記事一覧ページ(/ikukyu/guide)へリンクする
export default function GuideBreadcrumb() {
  return (
    <nav className="text-[11px] text-gray-400">
      <Link href="/" className="hover:underline">べんりやつーる</Link>
      <span className="mx-1">›</span>
      <Link href="/ikukyu" className="hover:underline">育休シミュレーター</Link>
      <span className="mx-1">›</span>
      <Link href="/ikukyu/guide" className="hover:underline">ガイド</Link>
    </nav>
  )
}
