import type { WatchlistEntry, Criteria, WatchlistChannel } from '../../../ai-dev-digest/lib/watchlistTypes'
import type { SourceDirectoryRow } from './types'

// ai-dev-digestのwatchlist.json・criteria.jsonから、公式組織/個人YouTube/個人ブログ/Qiita/Zennの
// 5グループの表示行を組み立てる(仕様: design.md「アプリごとの表示行を組み立てる処理」手順1)。
// categoryで公式組織/個人YouTube/個人ブログを分け、category: 'platform'はidでQiita/Zennに分ける

// 情報源1件の代表リンクを決める(決定事項「情報源へのリンクURL」。RSS→YouTube→公式ページの順で
// 見つかった1つを使う。ai-dev-digestの情報源はプラットフォーム(Qiita/Zenn)自体が代表リンクを持つ)
function resolveLink(channels: WatchlistChannel[]): string {
  const rss = channels.find((c) => c.type === 'rss')
  if (rss && rss.type === 'rss') return rss.feedUrl

  const youtube = channels.find((c) => c.type === 'youtube')
  if (youtube && youtube.type === 'youtube') return `https://www.youtube.com/${youtube.channelId}`

  if (channels.some((c) => c.type === 'platform-qiita')) return 'https://qiita.com/'
  if (channels.some((c) => c.type === 'platform-zenn')) return 'https://zenn.dev/'

  throw new Error('情報源のリンクを解決できませんでした(未知のチャンネル構成)')
}

function toSources(entries: WatchlistEntry[]): SourceDirectoryRow['sources'] {
  return entries.map((entry) => ({ name: entry.name, url: resolveLink(entry.channels) }))
}

export function buildAiDevDigestSources(watchlist: WatchlistEntry[], criteria: Criteria): SourceDirectoryRow[] {
  const official = watchlist.filter((w) => w.category === 'official')
  const individualYoutube = watchlist.filter((w) => w.category === 'individual-youtube')
  const individualBlog = watchlist.filter((w) => w.category === 'individual-blog')
  const qiita = watchlist.filter((w) => w.id === 'qiita')
  const zenn = watchlist.filter((w) => w.id === 'zenn')

  return [
    {
      genreLabel: '公式組織',
      methodLabel: '固定リスト',
      // requirements.md#採用基準(種別ごとの定量判定)-4
      criteriaText: '新着投稿(ブログ記事・YouTube動画)はすべて採用候補にする',
      sources: toSources(official),
      searchHints: [],
    },
    {
      genreLabel: '個人YouTube',
      methodLabel: '固定リスト',
      // requirements.md#採用基準(種別ごとの定量判定)-5
      criteriaText: `直近${criteria.youtubeCandidateVideoCount}本の動画のうち、チャンネルの動画群の平均再生回数を明確に上回るものを採用候補にする`,
      sources: toSources(individualYoutube),
      searchHints: [],
    },
    {
      genreLabel: '個人ブログ',
      methodLabel: '固定リスト',
      // requirements.md#採用基準(種別ごとの定量判定)-6
      criteriaText: `新着投稿を採用候補にする(公式RSSの本文が${criteria.minIndividualBlogBodyChars}文字未満の投稿は除く)`,
      sources: toSources(individualBlog),
      searchHints: [],
    },
    {
      genreLabel: 'Qiita',
      methodLabel: '固定リスト',
      // requirements.md#採用基準(種別ごとの定量判定)-7
      criteriaText: `直近${criteria.qiitaMaxAgeDays}日以内に公開された記事のうち、いいね数${criteria.qiitaMinLikes}以上のものを採用候補にする`,
      sources: toSources(qiita),
      searchHints: [],
    },
    {
      genreLabel: 'Zenn',
      methodLabel: '固定リスト',
      // requirements.md#採用基準(種別ごとの定量判定)-8
      criteriaText: `新着記事のうち、いいね数${criteria.zennMinLikes}以上のものを採用候補にする`,
      sources: toSources(zenn),
      searchHints: [],
    },
  ]
}
