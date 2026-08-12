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

// 固定4観点1つ分(content-generation/requirements.md#要約-9〜12。2026-08追加)
export type SummaryPerspective = {
  heading: string // 結論・メリット・変化を含む見出し(テーマ名にしない。requirements.md#要約-9)
  teaser: string // 常時表示する導入文。40〜140字(目安60〜120字。requirements.md#要約-3)
  detail: string // 「詳細を見る」操作で展開表示する詳細文(4観点合計800〜1700字。目安1000〜1500字。requirements.md#要約-4)
}

// 固定4観点。この4キー・この順序で固定(requirements.md#要約-5・12。2026-08追加)
export type TopicSummary = {
  benefit: SummaryPerspective // 🚀 自分にとって何が嬉しいか
  whatsNew: SummaryPerspective // 💡 何が新しいか
  how: SummaryPerspective // 🛠 どう実現しているか
  howToUse: SummaryPerspective // 🎯 自分はどう使えるか
}

export type Importance = 1 | 2 | 3 | 4 | 5 // 重要度(requirements.md#重要度-13〜14。2026-08追加)

type TopicBase = {
  id: string // 記事内で一意。フィードバックの紐付けに使う(例: "topic-1")。表示順=配列順
  heading: string
  sourceType: SourceType
  sourceName: string // 発信者名(例: "Anthropic"、"Andrej Karpathy")
  sourceUrl: string // 出典の元URL
  sourcePublishedAt?: string // 元記事・動画のISO 8601形式の公開日時。content-selectionが収集したCandidate.publishedAtをそのまま引き継ぐ(エージェントが新たに調べ直す値ではない)。任意項目: 本フィールド導入前に生成された既存記事データには存在しないため、無い場合は投稿日時を表示しない(requirements.md#記事本文表示-11)
  youtubeVideoId?: string // YouTube動画を紹介する場合のみ。公式埋め込みプレーヤー表示に使う
  belowCriteria: boolean // 採用基準未達での掲載(content-selection/requirements.md#1日の掲載件数-10)
  belowCriteriaReason?: string // belowCriteriaがtrueの場合のみ必須。基準からの乖離内容
}

// 2026-08以前に生成された既存記事データ(可変長セクション・重要度なし)。無理な再生成・変換は行わない(requirements.md#記事本文表示-13)
export type LegacyTopic = TopicBase & {
  sections: SummarySection[] // 目安2〜4セクション、detail合計1000〜1500字程度
}

// 2026-08以降に生成される記事データ(固定4観点+重要度)
export type CurrentTopic = TopicBase & {
  summary: TopicSummary
  importance: Importance
}

export type Topic = LegacyTopic | CurrentTopic

export type Article = {
  date: string // YYYY-MM-DD。ファイル名と一致
  topics: Topic[] // 1〜5件(基準を満たす候補が不足する日は1〜2件になりうる)
}

// TopicがLegacyTopic(2026-08以前生成)かどうかを判定する型ガード。`sections`キーの有無で判定する
// (CurrentTopicは`summary`キーを持ち`sections`キーを持たないため、互いに排他)
export function isLegacyTopic(topic: Topic): topic is LegacyTopic {
  return 'sections' in topic
}
