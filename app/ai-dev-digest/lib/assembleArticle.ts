import type { Article, Importance, SourceType, SummarySection, Topic, TopicSummary } from './types'

// 選定結果(content-selection)+生成済みの見出し・要約(content-generation、エージェントの推論)
// からArticleを組み立てる純粋関数(仕様: design.md「1日分の記事を生成する処理」手順5)。
// エージェントは見出し・要約・出典・belowCriteriaを渡すのみで、記事内で一意なTopic.idの採番は
// このコードが担う(要件はid採番方法を定めていないため設計判断。表示順=配列順にそのまま従う)。
// 2026-08修正: content-generationの要約フォーマットが固定4観点+重要度に変わったため、article-detailの
// Topic型(LegacyTopic/CurrentTopic)と対になる形でsections(旧形式)/summary+importance(新形式)の
// どちらか一方を受け取るユニオン型にした(content-generation/tasks.md Task 12)
type GeneratedTopicInputBase = {
  heading: string // エージェントが日本語で書いた見出し(content-generation/design.md参照)
  sourceType: SourceType
  sourceName: string
  sourceUrl: string
  sourcePublishedAt?: string // 選定結果(SelectedTopic.publishedAt)をそのまま引き継ぐ。エージェントが新たに調べ直す値ではない(任意項目。types.ts参照)
  youtubeVideoId?: string // extractYoutubeVideoIdの結果(抽出できた場合のみ)
  belowCriteria: boolean
  belowCriteriaReason?: string
}

export type GeneratedTopicInput =
  | (GeneratedTopicInputBase & { sections: SummarySection[] }) // 旧形式(2026-08以前生成データ相当)
  | (GeneratedTopicInputBase & { summary: TopicSummary; importance: Importance }) // 新形式(2026-08以降)

export function assembleArticle(date: string, topics: GeneratedTopicInput[]): Article {
  return {
    date,
    topics: topics.map((topic, index): Topic => {
      const base = {
        id: `topic-${index + 1}`,
        heading: topic.heading,
        sourceType: topic.sourceType,
        sourceName: topic.sourceName,
        sourceUrl: topic.sourceUrl,
        belowCriteria: topic.belowCriteria,
        ...(topic.sourcePublishedAt ? { sourcePublishedAt: topic.sourcePublishedAt } : {}),
        ...(topic.youtubeVideoId ? { youtubeVideoId: topic.youtubeVideoId } : {}),
        ...(topic.belowCriteriaReason ? { belowCriteriaReason: topic.belowCriteriaReason } : {}),
      }
      if ('sections' in topic) {
        return { ...base, sections: topic.sections }
      }
      return { ...base, summary: topic.summary, importance: topic.importance }
    }),
  }
}
