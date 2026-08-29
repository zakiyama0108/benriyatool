'use client'

import { useState } from 'react'
import type { RuleChapter } from '../lib/games'
import { RULE_CHAPTERS } from '../lib/rulesChapters'

type Props = {
  rulesSimple: string
  rulesDetailed: RuleChapter[]
}

// 簡単版/詳しい版のタブ切り替え表示(仕様: game-detail/design.md「ルール本文をタブで表示する処理」)。
// 初期は簡単版。詳しい版は共通章立て(RULE_CHAPTERS)の順に見出し付きで表示し、本文が空の章・
// 共通章立てにない未知のキーは表示しない(rules_detailedはanonが任意jsonbを入れうる列のため、
// 定義済みの章だけを描画して壊れた構造・想定外キーに頑健にする。design.md#ルール本文をタブで表示する処理)。
// 本文はReactの既定エスケープで描画する(dangerouslySetInnerHTMLを使わない。design.md#セキュリティ)。
export default function RuleTabs({ rulesSimple, rulesDetailed }: Props) {
  const [tab, setTab] = useState<'simple' | 'detailed'>('simple')

  // 章キー→本文の対応を作り、共通章立ての順に本文のある章だけを取り出す
  const bodyByKey = new Map(rulesDetailed.map((c) => [c.key, c.body]))
  const detailedChapters = RULE_CHAPTERS.map((chapter) => ({
    heading: chapter.heading,
    body: bodyByKey.get(chapter.key) ?? '',
  })).filter((c) => c.body.trim() !== '')

  return (
    <div className="mt-6">
      <div className="flex gap-1 border-b border-bgr-line">
        {(['simple', 'detailed'] as const).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 text-sm font-bold transition-colors ${
              tab === key
                ? 'border-b-2 border-bgr-accent text-bgr-accent'
                : 'text-bgr-subtext hover:text-bgr-text'
            }`}
          >
            {key === 'simple' ? '簡単版' : '詳しい版'}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'simple' ? (
          <p className="whitespace-pre-wrap text-sm text-bgr-text">{rulesSimple}</p>
        ) : (
          <div className="space-y-4">
            {detailedChapters.map((chapter) => (
              <section key={chapter.heading}>
                <h3 className="mb-1 text-sm font-bold text-bgr-text">{chapter.heading}</h3>
                <p className="whitespace-pre-wrap text-sm text-bgr-text">{chapter.body}</p>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
