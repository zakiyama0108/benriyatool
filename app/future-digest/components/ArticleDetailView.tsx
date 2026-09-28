'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Article } from '../lib/types'
import { HORIZON_LABELS, horizonsForIssue } from '../lib/types'
import { buildArticleTitle } from '../lib/articleTitle'
import { sortSlots, type SortOrder } from '../lib/sortSlots'
import { getSession, onAuthChange, signInWithGoogle, signOut, isAuthorizedAdmin } from '../../lib/adminAuth'
import { fetchBookmarksByArticle, type BookmarkSummary } from '../lib/bookmarks'
import SortToggle from './SortToggle'
import PredictionCard from './PredictionCard'
import LoginStatus from './LoginStatus'

type Props = {
  article: Article
}

// 記事詳細ページの組み立て(仕様: requirements.md#記事本文の表示-1、requirements.md#並び順の切り替え-7・10、
// design.md「その回の記事本文を表示する処理」)。generateStaticParams・記事データの読み込み
// (fsアクセス)はサーバーコンポーネント側のapp/future-digest/[id]/page.tsxで行い、ここでは
// propsで受け取った記事データを表示するのみ。ログインセッションの取得・購読はクライアント側でのみ
// 可能なため、このコンポーネントは'use client'にする(trend-digestのArticleDetailViewと同じ構成)
export default function ArticleDetailView({ article }: Props) {
  const [order, setOrder] = useState<SortOrder>('impact')
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [bookmarks, setBookmarks] = useState<Map<string, BookmarkSummary>>(new Map())

  useEffect(() => {
    let active = true
    void getSession().then((s) => {
      if (active) setSession(s)
    })
    const unsubscribe = onAuthChange(() => {
      void getSession().then((s) => {
        if (active) setSession(s)
      })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // 記事内の自分の付箋をまとめて取得する処理(design.md「記事内の自分の付箋をまとめて取得する処理」)。
  // 未ログインなら何も取得しない(bookmark/requirements.md#記事への付箋-5)。取得に失敗した場合は
  // 全予測を「未付箋」として扱う(design.md手順3)
  useEffect(() => {
    if (!session) {
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

  // ログイン状態に応じてフィードバック入力欄の表示を切り替える処理(design.md「ログイン状態に
  // 応じてフィードバック入力欄の表示を切り替える処理」)。確認中・セッションなし・確認失敗は
  // いずれも「未許可」として扱う(失敗時は画面にエラーを出さずコンソールにのみ出力する。
  // requirements.md#運営者向けフィードバック-11)
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

  const title = buildArticleTitle(article.date)
  const horizons = horizonsForIssue(article.issueNumber)
  const slots = sortSlots(article, order)

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50/40 to-white">
      <article className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <nav className="text-[11px] text-gray-400">
          <Link href="/" className="hover:underline">
            べんりやつーる
          </Link>
          <span className="mx-1">›</span>
          <Link href="/future-digest" className="hover:underline">
            週刊未来予測
          </Link>
          <span className="mx-1">›</span>
          <span>{title}</span>
        </nav>

        <header>
          <h1 className="text-xl font-bold leading-relaxed tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-xs text-gray-500">{article.date}</p>
          <p className="mt-1 text-xs text-gray-500">
            今回の時間軸: {HORIZON_LABELS[horizons[0]]}/{HORIZON_LABELS[horizons[1]]}
          </p>
        </header>

        <SortToggle order={order} onChange={setOrder} />

        <div className="space-y-4">
          {slots.map((slot) => (
            <PredictionCard
              key={`${slot.genre}--${slot.horizon}`}
              slot={slot}
              articleId={article.id}
              isAdmin={isAdmin}
              session={session}
              bookmark={slot.kind === 'prediction' ? bookmarks.get(slot.prediction.id) ?? null : null}
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
