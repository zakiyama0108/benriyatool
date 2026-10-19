'use client'

import { useEffect, useState } from 'react'
import { getSession, onAuthChange, signInWithGoogle } from '../../lib/adminAuth'
import { fetchAllBookmarks, type BookmarkRecord } from '../lib/bookmarks'
import type { FindingIndexEntry } from '../lib/findingIndex'
import BookmarkListItem from './BookmarkListItem'

type Props = {
  // 「記事ID:研究ID」→見出し・ジャンルの索引(app/research-digest/lib/findingIndex.ts)
  findingIndex: Record<string, FindingIndexEntry>
}

// 画面の状態。セッション確認中/未ログイン/付箋取得中/表示中の4状態(design.md「状態管理」)。
type Phase = 'checking' | 'login' | 'loading' | 'ready'

// 付箋一覧ページの本体(仕様: requirements.md#付箋の一覧-9・13〜14、design.md「付箋一覧を
// 表示する処理」「状態管理」)。セッション確認中・取得中はローディング表示のみを行い、
// 未ログイン/0件のどちらか一方に暫定的に倒さない(design.md「画面設計」)。
// news-digestのBookmarkListView.tsxと同じ実装に、削除した項目を一覧から消す処理を加えたもの
export default function BookmarkListView({ findingIndex }: Props) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([])

  useEffect(() => {
    let active = true
    async function checkSession() {
      const session = await getSession()
      if (!active) return
      setPhase(session ? 'loading' : 'login')
    }
    void checkSession()
    const unsubscribe = onAuthChange(() => void checkSession())
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (phase !== 'loading') return
    let active = true
    fetchAllBookmarks()
      .then((list) => {
        if (!active) return
        setBookmarks(list)
        setPhase('ready')
      })
      .catch((e) => {
        if (!active) return
        // eslint-disable-next-line no-console -- 原因究明用。画面にはエラーを出さず「0件」として扱う
        console.error('付箋一覧: 取得に失敗しました', e)
        setBookmarks([])
        setPhase('ready')
      })
    return () => {
      active = false
    }
  }, [phase])

  // 削除に成功した項目を一覧から消す(bookmark/design.md「付箋一覧からの編集・削除」)
  function handleDeleted(id: string) {
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
  }

  if (phase === 'checking' || phase === 'loading') {
    return <p className="px-4 py-16 text-center text-sm text-gray-400">読み込み中…</p>
  }

  if (phase === 'login') {
    return (
      <div className="space-y-3 rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-gray-600">ログインすると、貼った付箋を一覧で確認できます。</p>
        <button
          onClick={() => void signInWithGoogle(window.location.href)}
          className="rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white"
        >
          Googleでログイン
        </button>
      </div>
    )
  }

  // phase === 'ready'。対応する研究が記事データから見つからない場合は一覧から除外する
  // (存在しないリンク先を作らないため。design.md「付箋一覧を表示する処理」手順3)
  const items = bookmarks
    .map((bookmark) => {
      const entry = findingIndex[`${bookmark.articleId}:${bookmark.findingId}`]
      return entry !== undefined ? { bookmark, entry } : null
    })
    .filter((item): item is { bookmark: BookmarkRecord; entry: FindingIndexEntry } => item !== null)

  if (items.length === 0) {
    return <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">まだ付箋がありません。</p>
  }

  return (
    <ul className="space-y-3">
      {items.map(({ bookmark, entry }) => (
        <BookmarkListItem
          key={bookmark.id}
          articleId={bookmark.articleId}
          entry={entry}
          bookmark={{ id: bookmark.id, findingId: bookmark.findingId, memo: bookmark.memo }}
          onDeleted={() => handleDeleted(bookmark.id)}
        />
      ))}
    </ul>
  )
}
