// 情報源ウォッチリスト・採用基準の型定義(仕様: design.md「データ設計(ウォッチリスト・採用基準)」)。
// 実データはcontent/ai-dev-digest/watchlist.json・criteria.jsonに置く(requirements.mdとの二重管理。
// 変更はwatchlist-reviewの月次見直しのみで行う)

import type { SourceType } from './types'

export type WatchlistCategory = 'official' | 'individual-youtube' | 'individual-blog' | 'platform'

export type WatchlistChannel =
  | { type: 'youtube'; channelId: string }
  | { type: 'rss'; feedUrl: string }
  | { type: 'platform-qiita' }
  | { type: 'platform-zenn' }

export type WatchlistEntry = {
  id: string // 例: "anthropic", "karpathy"
  category: WatchlistCategory
  name: string // 例: "Anthropic"
  channels: WatchlistChannel[]
}

export type Criteria = {
  dailyTopicCount: { min: number; max: number } // requirements.md#1日の掲載件数-9
  youtubeRecentVideoWindow: number // 平均再生回数の算出対象本数(候補群を除いた直後のこの本数)
  // 個人YouTubeチャンネルで採用候補として評価する直近動画の本数(requirements.md#採用基準-5)
  youtubeCandidateVideoCount: number
  youtubeAboveAverageRatio: number // 平均の何倍を上回れば採用候補にするか
  qiitaMinLikes: number // requirements.md#採用基準-7
  // Qiita記事を採用候補にする公開後の経過日数の上限(requirements.md#採用基準-7)
  qiitaMaxAgeDays: number
  zennMinLikes: number // requirements.md#採用基準-8
  // 個人ブログ(individual-blog)の投稿を採用候補にする、公式RSS本文のHTMLタグ除去後の
  // 最小文字数。この未満の投稿は収集時点で除外する(requirements.md#採用基準-6)
  minIndividualBlogBodyChars: number
  // 原文タイトル(大文字小文字を区別しない)にこの配列のいずれかが含まれる候補を、他の基準を
  // 満たしていても採用候補から除外する。原文タイトルは情報源により日英いずれもありうるため
  // 日英両方のキーワードを登録する運用とする(requirements.md#話題の関連性-12)
  topicExcludeKeywords: string[]
  // この配列に含まれる種別は、同じ情報源(sourceId)から同日に複数候補が挙がった場合、
  // 公開日時が最も新しい1件のみを採用候補に残す(requirements.md#情報源内の重複掲載の抑制-13)
  duplicateSuppressionSourceTypes: SourceType[]
}
