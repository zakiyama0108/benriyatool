'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Article } from '../lib/types'
import { GENRE_ORDER } from '../lib/types'
import { buildArticleTitle } from '../lib/articleTitle'
import { getSession, onAuthChange, signInWithGoogle, signOut, isAuthorizedAdmin } from '../../lib/adminAuth'
import GenreSection from './GenreSection'
import LoginStatus from './LoginStatus'

type Props = {
  article: Article
}

// 記事詳細ページの組み立て(仕様: requirements.md#記事本文表示-1、design.md「関連するファイル」)。
// generateStaticParams・記事データの読み込み(fsアクセス)はサーバーコンポーネント側の
// app/trend-digest/[id]/page.tsxで行い、ここではpropsで受け取った記事データを表示するのみ。
// ログインセッションの取得・購読はクライアント側でのみ可能なため、このコンポーネントは
// 'use client'にする(ai-dev-digestのArticleDetailViewと同じ構成)。
// 記事の組み立て自体はTDD対象外(個々の表示ロジックはGenreSection/TopicCard等のテストで
// 担保済み)だが、isAdmin判定の条件分岐はArticleDetailView.test.tsxで検証する(tasks.md Task8)
export default function ArticleDetailView({ article }: Props) {
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

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

  // ログイン状態に応じてフィードバック入力欄の表示を切り替える処理(design.md「ログイン状態に
  // 応じてフィードバック入力欄の表示を切り替える処理」)。確認中・セッションなし・確認失敗は
  // いずれも「未許可」として扱う(失敗時は画面にエラーを出さずコンソールにのみ出力する。
  // requirements.md#運営者向けフィードバック-6)
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

  const title = buildArticleTitle(article.edition, article.date)

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/40 to-white">
      <article className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <nav className="text-[11px] text-gray-400">
          <Link href="/" className="hover:underline">
            べんりやつーる
          </Link>
          <span className="mx-1">›</span>
          <Link href="/trend-digest" className="hover:underline">
            週刊トレンド
          </Link>
          <span className="mx-1">›</span>
          <span>{title}</span>
        </nav>

        <header>
          <h1 className="text-xl font-bold leading-relaxed tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-xs text-gray-500">{article.date}</p>
        </header>

        <div className="space-y-6">
          {GENRE_ORDER[article.edition].map((genre) => (
            <GenreSection
              key={genre}
              genre={genre}
              topics={article.topics.filter((topic) => topic.genre === genre)}
              isAdmin={isAdmin}
              articleId={article.id}
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
