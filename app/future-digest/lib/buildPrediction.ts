import type { Candidate } from './candidateTypes'
import type { Prediction } from './types'

export type GeneratedContent = {
  heading: string
  body: string
}

// 記事データの1本分を組み立てる処理(仕様: content-generation/requirements.md#記事の構成-6、
// content-generation/design.md「記事データの1本分を組み立てる処理」)。
// ジャンル・時間軸・影響度・影響度の根拠・対象時期・出典は選定時の値をそのまま使い、
// 見出し・本文だけを生成結果から取る。予測IDは`<genre>--<horizon>`とする
// (article-detail/design.md「前提: 記事データの形式」)
export function buildPrediction(candidate: Candidate, generated: GeneratedContent): Prediction {
  return {
    id: `${candidate.genre}--${candidate.horizon}`,
    genre: candidate.genre,
    horizon: candidate.horizon,
    heading: generated.heading,
    body: generated.body,
    impact: candidate.impact,
    impactReason: candidate.impactReason,
    targetPeriod: candidate.targetPeriod,
    sourceTitle: candidate.sourceTitle,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
  }
}
