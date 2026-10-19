import Link from 'next/link'

const APP_NAME = '週刊研究発見'
const APP_PATH = '/research-digest'

type Props = {
  // 記事詳細ページ・付箋一覧ページではアプリ名をリンクにし、currentを末尾の現在地として追加する。
  // 記事一覧ページでは指定せず、アプリ名自体を現在地(リンクなし)として表示する
  current?: string
}

// ダイジェスト各ページ共通のパンくず(仕様: article-list/requirements.md#パンくずナビゲーション-1、
// article-detail/requirements.md#パンくずナビゲーション-1、bookmark/requirements.md#パンくずナビゲーション-1)。
// べんりやつーる(/)› 週刊ダイジェスト一覧(/blog)の2階層は常に表示し、ブログハブへ戻れるようにする
export default function Breadcrumb({ current }: Props) {
  return (
    <nav className="text-[11px] text-gray-400">
      <Link href="/" className="hover:underline">
        べんりやつーる
      </Link>
      <span className="mx-1">›</span>
      <Link href="/blog" className="hover:underline">
        週刊ダイジェスト一覧
      </Link>
      <span className="mx-1">›</span>
      {current ? (
        <Link href={APP_PATH} className="hover:underline">
          {APP_NAME}
        </Link>
      ) : (
        <span>{APP_NAME}</span>
      )}
      {current !== undefined && (
        <>
          <span className="mx-1">›</span>
          <span>{current}</span>
        </>
      )}
    </nav>
  )
}
