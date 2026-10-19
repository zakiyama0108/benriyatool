import type { WatchlistEntry, Criteria, WatchlistChannel, CategoryId } from '../../../news-digest/lib/watchlistTypes'
import type { SourceDirectoryRow } from './types'

// news-digestのwatchlist.json・criteria.jsonから、4カテゴリ(総合/経済・ビジネス/神奈川ローカル/育児)
// の表示行を組み立てる(仕様: design.md「アプリごとの表示行を組み立てる処理」手順2)。
// カテゴリはwatchlist.jsonの登録順をそのままジャンル行とする(並び替えは行わない)
const CATEGORY_ORDER: CategoryId[] = ['general', 'business', 'kanagawa', 'childcare']

const CATEGORY_LABELS: Record<CategoryId, string> = {
  general: '総合',
  business: '経済・ビジネス',
  kanagawa: '神奈川ローカル',
  childcare: '育児',
}

// 専用枠(神奈川ローカル・育児)は2社以上の裏付けを要求しない(requirements.md#採用基準(カテゴリ
// ごとの定量判定)-5)
const DEDICATED_SLOT_CATEGORIES: CategoryId[] = ['kanagawa', 'childcare']

function resolveLink(channels: WatchlistChannel[]): string {
  const rss = channels.find((c) => c.type === 'rss')
  if (rss && rss.type === 'rss') return rss.feedUrl

  const officialPage = channels.find((c) => c.type === 'official-page')
  if (officialPage && officialPage.type === 'official-page') return officialPage.url

  throw new Error('情報源のリンクを解決できませんでした(未知のチャンネル構成)')
}

function buildCriteriaText(category: CategoryId, minCorroboratingSources: number): string {
  if (DEDICATED_SLOT_CATEGORIES.includes(category)) {
    // requirements.md#採用基準(カテゴリごとの定量判定)-5
    return '専用枠として、基準を満たさなくてもその週で最も重要なもの1件を優先的に採用する'
  }
  // requirements.md#採用基準(カテゴリごとの定量判定)-4
  return `固定リストの情報源のうち${minCorroboratingSources}社以上が同時に報じているニュースを採用する`
}

export function buildNewsDigestSources(watchlist: WatchlistEntry[], criteria: Criteria): SourceDirectoryRow[] {
  return CATEGORY_ORDER.map((category) => {
    const entries = watchlist.filter((w) => w.category === category)
    return {
      genreLabel: CATEGORY_LABELS[category],
      methodLabel: '固定リスト',
      criteriaText: buildCriteriaText(category, criteria.minCorroboratingSources),
      sources: entries.map((entry) => ({ name: entry.name, url: resolveLink(entry.channels) })),
      searchHints: [],
    }
  })
}
