'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import type { Article } from '../lib/types'
import { buildArticleTitle } from '../lib/articleTitle'
import { getSession, onAuthChange, signInWithGoogle, signOut } from '../../lib/adminAuth'
import TopicSection from './TopicSection'
import LoginStatus from './LoginStatus'

type Props = {
  article: Article
}

// 記事詳細ページの組み立て(仕様: requirements.md#記事本文表示-1、design.md「関連するファイル」)。
// generateStaticParams・記事データの読み込み(fsアクセス)はサーバーコンポーネント側の
// app/ai-dev-digest/[date]/page.tsxで行い、ここではpropsで受け取った記事データを表示するのみ。
// ログインセッションの取得・購読はクライアント側でのみ可能なため、このコンポーネントは
// 'use client'にする(life-money-sim/page.tsxと同じ方式。design.md「状態管理」)。
// TDD対象外(ページ組み立てのみで、個々の表示ロジックはTopicSection等のテストで担保済み。
// tasks.md Task11参照)
export default function ArticleDetailView({ article }: Props) {
  const [session, setSession] = useState<Session | null>(null)

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

  const hasBelowCriteriaTopic = article.topics.some((topic) => topic.belowCriteria)

  const title = buildArticleTitle(article.date)

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50/40 to-white">
      <article className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <nav className="text-[11px] text-gray-400">
          <Link href="/" className="hover:underline">
            べんりやつーる
          </Link>
          <span className="mx-1">›</span>
          <Link href="/ai-dev-digest" className="hover:underline">
            AI駆動開発ダイジェスト
          </Link>
          <span className="mx-1">›</span>
          <span>{title}</span>
        </nav>

        <header>
          <h1 className="text-xl font-bold leading-relaxed tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-xs text-gray-500">{article.date}</p>
        </header>

        {hasBelowCriteriaTopic && (
          <p className="rounded-2xl bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
            この日は基準を満たす候補が少なかったため、一部のトピックは基準に届いていない内容を含みます。
          </p>
        )}

        <div className="space-y-4">
          {article.topics.map((topic) => (
            <TopicSection key={topic.id} topic={topic} session={session} articleDate={article.date} />
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
