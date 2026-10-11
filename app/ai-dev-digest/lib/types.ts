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

// 図解(news-digest/article-detail/design.mdの前提: 記事データの形式と同一の形。
// content-generation/requirements.md#図解-17、article-detail/requirements.md#記事本文表示-14。2026-09追加)
export type Diagram = { type: 'mermaid'; code: string } | { type: 'image'; path: string }

// 固定4観点1つ分(content-generation/requirements.md#要約-9〜12。2026-08追加)
export type SummaryPerspective = {
  heading: string // 結論・メリット・変化を含む見出し(テーマ名にしない。requirements.md#要約-9)
  teaser: string // 常時表示する導入文。40〜140字(目安60〜120字。requirements.md#要約-3)
  detail: string // 「詳細を見る」操作で展開表示する詳細文(4観点合計800〜1700字。目安1000〜1500字。requirements.md#要約-4)
  diagram?: Diagram | null // 図解(article-detail/requirements.md#記事本文表示-14)。既存の公開済み記事データ(diagramキーを持たない)との後方互換のため省略可能。2026-09追加
}

// 開発領域(content-generation/requirements.md#開発領域-15〜16。2026-09追加)
export type Domain =
  | 'frontend'
  | 'backend'
  | 'infra'
  | 'security'
  | 'ai-llm'
  | 'architecture'
  | 'data-science'
  | 'maintenance'
  | 'other'
export const DOMAIN_LABELS: Record<Domain, string> = {
  frontend: 'フロントエンド',
  backend: 'バックエンド',
  infra: 'インフラ',
  security: 'セキュリティ',
  'ai-llm': 'AI・LLM',
  architecture: 'アーキテクチャ',
  'data-science': 'データサイエンス',
  maintenance: '保守運用',
  other: 'その他業務',
}

// 🧭開発領域観点のみが持つ追加フィールド(requirements.md#開発領域-15〜16。2026-09追加)
export type DomainPerspective = SummaryPerspective & {
  domains: Domain[] // 該当する開発領域(1件以上)
}

// 【最新形式】固定4観点。この4キー・この順序で固定(requirements.md#要約-5・12)。2026-09追加
// (💡新規性を廃止し🧭開発領域を追加した形式)
export type TopicSummaryWithDomain = {
  domain: DomainPerspective // 🧭 どの開発領域の話で、既存の作業をどう変えるか
  benefit: SummaryPerspective // 🚀 自分にとって何が嬉しいか
  how: SummaryPerspective // 🛠 どう実現しているか
  howToUse: SummaryPerspective // 🎯 自分はどう使えるか
}

// 【旧形式】🧭開発領域観点の追加より前に生成された記事データが持つ固定4観点。
// 過去記事を書き換えずそのまま表示し続けるため、最新形式と並存させる(requirements.md#記事本文表示-3。2026-08導入・2026-09に旧形式として残置)
export type TopicSummaryWithWhatsNew = {
  benefit: SummaryPerspective // 🚀 自分にとって何が嬉しいか
  whatsNew: SummaryPerspective // 💡 何が新しいか
  how: SummaryPerspective // 🛠 どう実現しているか
  howToUse: SummaryPerspective // 🎯 自分はどう使えるか
}

export type TopicSummary = TopicSummaryWithDomain | TopicSummaryWithWhatsNew

// TopicSummaryがTopicSummaryWithDomain(🧭開発領域観点を含む最新形式)かどうかを判定する型ガード。
// `domain`キーの有無で判定する(2026-09追加)
export function hasDomainPerspective(summary: TopicSummary): summary is TopicSummaryWithDomain {
  return 'domain' in summary
}

// 固定ラベル(画面に常時表示する観点名そのもの。article-detail/requirements.md#記事本文表示-3)。
// 記事データには含めず、トピックごとに変わらない固定文言としてコード側の定数で持つ(2026-09追加)
export const PERSPECTIVE_LABELS: Record<'domain' | 'benefit' | 'whatsNew' | 'how' | 'howToUse', string> = {
  domain: '🧭開発領域',
  benefit: '🚀メリット',
  whatsNew: '💡新規性',
  how: '🛠仕組み',
  howToUse: '🎯活用法',
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
