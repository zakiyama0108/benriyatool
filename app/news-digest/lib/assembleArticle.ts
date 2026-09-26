import type { SelectedTopic } from './candidateTypes'
import type { GeneratedContent } from './generateContent'
import type { Article, Topic } from './types'

// 選定結果(content-selection、SelectedTopic)+生成済みの見出し・要約(content-generation、
// エージェントの推論、GeneratedContent)からArticleを組み立てる純粋関数
// (仕様: design.md「1週分の記事を生成する処理」手順5)。
// contentは候補ごとにscripts/news-digest/generate-content.tsをヘッドレス起動した結果であり、
// リトライしても生成に失敗した候補はnullになる。assembleArticleはcontent: nullの候補を
// topicsから除外することで、1候補の生成失敗が週全体の公開を止めないようにする
// (requirements.md#掲載件数の保証-2)。
// エージェントは見出し・重要度・要約のみを返し、記事内で一意なTopic.idの採番はこのコードが担う
// (要件はid採番方法を定めていないため設計判断。表示順=配列順にそのまま従う)
export type AssembleArticleInput = {
  candidate: SelectedTopic
  content: GeneratedContent | null // 生成失敗時(リトライしても利用可能な応答が得られなかった場合)はnull
}

export function assembleArticle(date: string, inputs: AssembleArticleInput[]): Article {
  const topics: Topic[] = inputs
    .filter((input): input is AssembleArticleInput & { content: GeneratedContent } => input.content !== null)
    .map((input, index) => {
      const { candidate, content } = input
      return {
        id: `topic-${index + 1}`,
        heading: content.heading,
        category: candidate.category,
        summary: content.summary,
        importance: content.importance,
        sourceName: candidate.sourceName,
        sourceUrl: candidate.url,
        sourcePublishedAt: candidate.publishedAt,
        belowCriteria: candidate.belowCriteria,
        ...(candidate.belowCriteriaReason ? { belowCriteriaReason: candidate.belowCriteriaReason } : {}),
      }
    })

  return { date, topics }
}
