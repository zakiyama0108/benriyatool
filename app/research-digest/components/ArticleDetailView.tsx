'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Article } from '../lib/types'
import { buildArticleTitle } from '../lib/articleTitle'
import { sortGenres, type SortOrder } from '../lib/sortGenres'
import { getSession, onAuthChange, signInWithGoogle, signOut, isAuthorizedAdmin } from '../../lib/adminAuth'
import { fetchBookmarksByArticle, type BookmarkSummary } from '../lib/bookmarks'
import SortToggle from './SortToggle'
import FindingCard from './FindingCard'
import LoginStatus from './LoginStatus'

type Props = {
  article: Article
}

// 記事詳細ページの組み立て(仕様: requirements.md#記事本文の表示-1、requirements.md#並び順の切り替え-7・10、
// design.md「その回の記事本文を表示する処理」)。記事データの読み込み(fsアクセス)は
// サーバーコンポーネント側のapp/research-digest/[id]/page.tsxで行い、ここではpropsで受け取る。
// ログインセッションの取得・購読はクライアント側でのみ可能なため'use client'にする
export default function ArticleDetailView({ article }: Props) {
  const [order, setOrder] = useState<SortOrder>('impact')
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bookmarks, setBookmarks] = useState<Map<string, BookmarkSummary>>(new Map())

  useEffect(() => {
    let active = true
    const load = () =>
      void getSession().then((s) => {
        if (active) setSession(s)
      })
    load()
    const unsubscribe = onAuthChange(load)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // 記事内の自分の付箋をまとめて取得する処理(bookmark/design.md「記事内の自分の付箋をまとめて取得する処理」)。
  // 未ログインなら何も取得しない(bookmark/requirements.md#記事への付箋-5)。取得に失敗した場合は
  // 全研究を「未付箋」として扱う(画面にはエラーを出さずコンソールにのみ出力する)
  useEffect(() => {
    if (!session) {
      // ログアウト時に付箋の表示を即座に引っ込める(session変化に同期する意図的なリセット)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBookmarks(new Map())
      return
    }
    let active = true
    fetchBookmarksByArticle(article.id)
      .then((map) => {
        if (active) setBookmarks(map)
      })
      .catch((e) => {
        if (active) setBookmarks(new Map())
        // eslint-disable-next-line no-console -- 原因究明用。画面にはエラーを出さず「未付箋」として扱う
        console.error('記事詳細: 付箋の取得に失敗しました', e)
      })
    return () => {
      active = false
    }
  }, [session, article.id])

  // ログイン状態に応じてフィードバック入力欄の表示を切り替える処理(design.md「ログイン状態に応じて
  // フィードバック入力欄の表示を切り替える処理」)。確認中・セッションなし・確認失敗はいずれも
  // 「未許可」として扱う(失敗時は画面にエラーを出さずコンソールにのみ出力する)
  useEffect(() => {
    if (!session) {
      // ログアウト時に運営者表示を即座に引っ込める(session変化に同期する意図的なリセット)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAdmin(false)
      return
    }
    let active = true
    isAuthorizedAdmin()
      .then((ok) => {
        if (active) setIsAdmin(ok)
      })
      .catch((e) => {
        if (active) setIsAdmin(false)
        // eslint-disable-next-line no-console -- 原因究明用。画面にはエラーを出さず「未許可」として扱う
        console.error('記事詳細: 運営者判定に失敗しました', e)
      })
    return () => {
      active = false
    }
  }, [session])

  // 付箋の作成・編集・削除をその場で記事内の付箋一覧(Map)へ反映する(bookmark/design.md「コンポーネント設計」)。
  // 再取得が起きてもキー(付箋id)が変わらず、編集中のBookmarkPanelが再マウントされないようにするため
  function handleBookmarkChange(findingId: string, bookmark: BookmarkSummary | null) {
    setBookmarks((prev) => {
      const next = new Map(prev)
      if (bookmark) next.set(findingId, bookmark)
      else next.delete(findingId)
      return next
    })
  }

  const title = buildArticleTitle(article.date, article.edition)
  const entries = sortGenres(article, order)

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-slate-50/40 to-white">
      <article className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <nav className="text-[11px] text-gray-400">
          <Link href="/" className="hover:underline">
            べんりやつーる
          </Link>
          <span className="mx-1">›</span>
          <Link href="/research-digest" className="hover:underline">
            週刊研究発見
          </Link>
          <span className="mx-1">›</span>
          <span>{title}</span>
        </nav>

        <header>
          <h1 className="text-xl font-bold leading-relaxed tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-xs text-gray-500">{article.date}</p>
        </header>

        <SortToggle order={order} onChange={setOrder} />

        <div className="space-y-4">
          {entries.map((entry) => (
            <FindingCard
              key={entry.genre}
              entry={entry}
              articleId={article.id}
              isAdmin={isAdmin}
              session={session}
              bookmark={entry.kind === 'finding' ? (bookmarks.get(entry.finding.id) ?? null) : null}
              onBookmarkChange={handleBookmarkChange}
            />
          ))}
        </div>

        <footer className="border-t border-gray-100 pt-4">
          <LoginStatus
            session={session}
            onLoginClick={() => void signInWithGoogle(window.location.href)}
            onLogoutClick={() => void signOut()}
          />
        </footer>
      </article>
    </div>
  )
}
