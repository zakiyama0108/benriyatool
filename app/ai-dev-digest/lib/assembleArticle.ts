import type { Article, SourceType, SummarySection, Topic } from './types'

// 選定結果(content-selection)+生成済みの見出し・章立て要約(content-generation、エージェントの推論)
// からArticleを組み立てる純粋関数(仕様: design.md「1日分の記事を生成する処理」手順5)。
// エージェントは見出し・sections・出典・belowCriteriaを渡すのみで、記事内で一意なTopic.idの採番は
// このコードが担う(要件はid採番方法を定めていないため設計判断。表示順=配列順にそのまま従う)
export type GeneratedTopicInput = {
  heading: string // エージェントが日本語で書いた見出し(content-generation/design.md参照)
  sections: SummarySection[] // エージェントが日本語で書いた章立て要約(目安2〜4セクション、detail合計1000〜1500字程度)
  sourceType: SourceType
  sourceName: string
  sourceUrl: string
  youtubeVideoId?: string // extractYoutubeVideoIdの結果(抽出できた場合のみ)
  belowCriteria: boolean
  belowCriteriaReason?: string
}

export function assembleArticle(date: string, topics: GeneratedTopicInput[]): Article {
  return {
    date,
    topics: topics.map((topic, index): Topic => ({
      id: `topic-${index + 1}`,
      heading: topic.heading,
      sections: topic.sections,
      sourceType: topic.sourceType,
      sourceName: topic.sourceName,
      sourceUrl: topic.sourceUrl,
      belowCriteria: topic.belowCriteria,
      ...(topic.youtubeVideoId ? { youtubeVideoId: topic.youtubeVideoId } : {}),
      ...(topic.belowCriteriaReason ? { belowCriteriaReason: topic.belowCriteriaReason } : {}),
    })),
  }
}
