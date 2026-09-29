import type { Candidate } from './candidateTypes'
import type { Finding } from './types'

export type GeneratedContent = {
  heading: string
  body: string
}

// 記事データの1本分を組み立てる処理(仕様: content-generation/requirements.md#記事の構成-6、
// content-generation/design.md「記事データの1本分を組み立てる処理」)。
// ジャンル・影響度・根拠・出典(論文名・発表元・URL・DOI・発表年)・査読前かどうかは選定時の値を
// そのまま使い、見出し・本文だけを生成結果から取る。研究IDはジャンルのidとする
// (article-detail/design.md「前提: 記事データの形式」)
export function buildFinding(candidate: Candidate, generated: GeneratedContent): Finding {
  return {
    id: candidate.genre,
    genre: candidate.genre,
    heading: generated.heading,
    body: generated.body,
    impact: candidate.impact,
    impactReason: candidate.impactReason,
    sourceTitle: candidate.sourceTitle,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
    doi: candidate.doi,
    publishedYear: candidate.publishedYear,
    isPreprint: candidate.isPreprint,
  }
}
