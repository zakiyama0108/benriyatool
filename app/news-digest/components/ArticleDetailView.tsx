'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import Link from 'next/link'
import { List } from 'lucide-react'
import type { Article } from '../lib/types'
import { buildArticleTitle } from '../lib/articleTitle'
import { getSession, onAuthChange, isAuthorizedAdmin } from '../../lib/adminAuth'
import TopicSection from './TopicSection'

type Props = {
  article: Article
}

// 記事詳細ページの組み立て(仕様: requirements.md#記事本文表示-1、design.md「関連するファイル」)。
// generateStaticParams・記事データの読み込み(fsアクセス)はサーバーコンポーネント側の
// app/news-digest/[date]/page.tsxで行い、ここではpropsで受け取った記事データを表示するのみ。
// ログインセッションの取得・購読はクライアント側でのみ可能なため、このコンポーネントは
// 'use client'にする(ai-dev-digest/ArticleDetailView.tsxと同じ方式)。
// 記事の組み立て自体はTDD対象外(個々の表示ロジックはTopicSection等のテストで担保済み。
// tasks.md Task11参照)だが、isAdmin判定の条件分岐はArticleDetailView.test.tsxで検証する
// (article-detail/tasks.md Task10)。
//
// 実装範囲についての注記: bookmark spec(本ブランチ作成時点で未実装)が提供する予定の
// ログイン状態表示(LoginStatus)・付箋操作(BookmarkPanel)はこのコンポーネントに含めない
// (article-detail/tasks.md Task10・Task11参照。bookmark実装時に配線が追加される中間状態)
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
  // requirements.md#運営者向けフィードバック-9)
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

  const hasBelowCriteriaTopic = article.topics.some((topic) => topic.belowCriteria)

  const title = buildArticleTitle(article.date)

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50/40 to-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10 md:grid md:grid-cols-[1fr_220px] md:items-start md:gap-8">
        <article className="mx-auto max-w-2xl space-y-5 md:mx-0">
          <nav className="text-[11px] text-gray-400">
            <Link href="/" className="hover:underline">
              べんりやつーる
            </Link>
            <span className="mx-1">›</span>
            <Link href="/news-digest" className="hover:underline">
              重要ニュースダイジェスト
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
              神奈川ローカル・育児は、全国規模の基準を満たさない場合も優先的に掲載しています。
            </p>
          )}

          <div className="space-y-4">
            {article.topics.map((topic) => (
              <TopicSection key={topic.id} topic={topic} isAdmin={isAdmin} articleDate={article.date} />
            ))}
          </div>
        </article>

        {/* デスクトップ幅(md以上)のみ表示する目次。各トピック見出しへのアンカーリンク
            (design.md「画面設計」)。モバイルでは本文がそのまま縦に並ぶため省略する */}
        <aside className="hidden md:sticky md:top-20 md:block">
          <nav aria-label="目次" className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <List className="h-4 w-4 text-teal-600" aria-hidden="true" />
              目次
            </h2>
            <ol className="space-y-2 text-[13px]">
              {article.topics.map((topic) => (
                <li key={topic.id}>
                  <a href={`#${topic.id}`} className="text-gray-600 hover:underline">
                    {topic.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      </div>
    </div>
  )
}
