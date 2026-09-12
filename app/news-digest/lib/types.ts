// 記事データの型定義(仕様: design.md「前提: 記事データの形式(この機能が定義する共有スキーマ)」)。
// 記事本文はDBではなくcontent/news-digest/articles/<date>.jsonとして管理する
// (architecture.md#3-設計方針)。article-list・content-selection・content-generation・
// weekly-publish・monthly-reviewはこの形式を共通して参照する。ai-dev-digestと異なり
// LegacyTopic/CurrentTopicのユニオン型は不要(新規アプリのため旧形式データが存在しない)

export type Category = 'general' | 'business' | 'kanagawa' | 'childcare'

export type SummaryPerspective = {
  heading: string // 結論・要点を含む見出し(テーマ名にしない。content-generation/requirements.md#要約-6)
  teaser: string // 常時表示する導入文。40〜140字(目安60〜120字)
  detail: string // 「詳細を見る」操作で展開表示する詳細文
}

// 固定4観点。この4キー・この順序で固定(content-generation/requirements.md#要約-4)
export type TopicSummary = {
  whatHappened: SummaryPerspective // 何が起きたか
  whyItMatters: SummaryPerspective // なぜ重要か(影響)
  background: SummaryPerspective // 背景
  outlook: SummaryPerspective // 今後の見通し
}

export type Importance = 1 | 2 | 3 | 4 | 5 // 重要度(requirements.md#記事本文表示-7)

export type Topic = {
  id: string // 記事内で一意。フィードバック・付箋の紐付けに使う(例: "topic-1")。表示順=配列順
  heading: string
  category: Category
  summary: TopicSummary
  importance: Importance
  sourceName: string // 発信者名(例: "NHK NEWS WEB"、"神奈川新聞")
  sourceUrl: string // 出典の元URL
  sourcePublishedAt?: string // 元記事のISO 8601形式の公開日時。content-selectionが収集した値をそのまま引き継ぐ
  belowCriteria: boolean // 専用枠での基準未達掲載(content-selection/requirements.md#採用基準(カテゴリごとの定量判定)-5)
  belowCriteriaReason?: string // belowCriteriaがtrueの場合のみ必須。基準からの乖離内容(例: "裏付けメディアが1社のみ")
}

export type Article = {
  date: string // YYYY-MM-DD。ファイル名と一致
  topics: Topic[] // 1〜7件(content-selection/requirements.md#1週あたりの掲載件数-6〜7)
}
