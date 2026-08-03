// 記事データの型定義(仕様: design.md「前提: 記事データの形式」)。
// 記事本文はDBではなくcontent/ai-dev-digest/articles/<date>.jsonとして管理する
// (architecture.md#3-設計方針)。article-list・content-selection・content-generation・
// daily-publish・watchlist-reviewはこの形式を共通して参照する

export type SourceType = 'official' | 'individual-youtube' | 'individual-blog' | 'qiita' | 'zenn'

// 要約の章立て1セクション分(content-generation/requirements.md#要約-2〜5)
export type SummarySection = {
  heading: string // セクション見出し
  teaser: string // 常時表示する導入文。40〜140字(目安60〜120字。content-generation/requirements.md#要約-3)
  detail: string // 「詳細を見る」操作で展開表示する詳細文(全セクション合計800〜1700字。目安1000〜1500字。content-generation/requirements.md#要約-4)
}

export type Topic = {
  id: string // 記事内で一意。フィードバックの紐付けに使う(例: "topic-1")。表示順=配列順
  heading: string
  sections: SummarySection[] // 章立て構成の要約。目安2〜4セクション、detail合計1000〜1500字程度(content-generation/requirements.md#要約-2〜5に従う)
  sourceType: SourceType
  sourceName: string // 発信者名(例: "Anthropic"、"Andrej Karpathy")
  sourceUrl: string // 出典の元URL
  sourcePublishedAt: string // 元記事・動画のISO 8601形式の公開日時。content-selectionが収集したCandidate.publishedAtをそのまま引き継ぐ(エージェントが新たに調べ直す値ではない。requirements.md#記事本文表示-11)
  youtubeVideoId?: string // YouTube動画を紹介する場合のみ。公式埋め込みプレーヤー表示に使う
  belowCriteria: boolean // 採用基準未達での掲載(content-selection/requirements.md#1日の掲載件数-10)
  belowCriteriaReason?: string // belowCriteriaがtrueの場合のみ必須。基準からの乖離内容
}

export type Article = {
  date: string // YYYY-MM-DD。ファイル名と一致
  topics: Topic[] // 1〜5件(基準を満たす候補が不足する日は1〜2件になりうる)
}
