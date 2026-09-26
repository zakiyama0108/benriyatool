import type { Article, Edition } from './types'
import { GENRE_LABELS } from './types'
import { buildArticleUrl } from './articleUrl'

// LINE配信メッセージ専用の見出し(仕様: requirements.md#配信内容-2、
// design.md「配信メッセージ本文を組み立てる処理」手順2)。
// 記事詳細ページの見出し(buildArticleTitle)とは別の文字列にする。buildArticleTitleを
// そのまま流用すると「週刊トレンド エンタメ編」という語句が重複表示されてしまうため、
// LINE配信専用に接頭辞+日付のみの形式にする(要件はメッセージ見出しの厳密な組み立て方まで
// 指定していないため設計判断)
const BROADCAST_TITLE_PREFIXES: Record<Edition, string> = {
  entertainment: '【週刊トレンド エンタメ編】',
  'culture-lifestyle': '【週刊トレンド カルチャー編】',
}

export function buildBroadcastTitle(edition: Edition, date: string): string {
  const [year, month, day] = date.split('-').map((part) => Number(part))
  return `${BROADCAST_TITLE_PREFIXES[edition]}${year}年${month}月${day}日号`
}

// LINEブロードキャストメッセージの本文を組み立てる(仕様: design.md「配信メッセージ本文を
// 組み立てる処理」)。配信専用タイトル・トピック見出し一覧(記事データのtopics配列順・
// ジャンル名付き・全件)・記事詳細ページリンクの3要素のみで構成し、トピックごとの出典URL
// (sourceUrl)は含めない(requirements.md#配信内容-1、3、4)。
// URLはbuildArticleUrlで導出し、記事ページ公開確認(waitForPageAvailable)と同じ文字列にする
export function buildBroadcastMessage(article: Article): string {
  const title = buildBroadcastTitle(article.edition, article.date)
  const headings = article.topics
    .map((topic) => `・【${GENRE_LABELS[topic.genre]}】${topic.heading}`)
    .join('\n')
  const url = buildArticleUrl(article)

  return [title, '', headings, '', '記事を読む', url].join('\n')
}
