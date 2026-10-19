import type { Candidate } from './candidateTypes'
import type { CurrentPrediction, PredictionSections } from './types'

export type GeneratedContent = {
  heading: string
  sections: PredictionSections
}

// 記事データの1本分を組み立てる処理(仕様: content-generation/requirements.md#記事の構成-7、
// content-generation/design.md「記事データの1本分を組み立てる処理」)。
// ジャンル・時間軸・影響度・影響度の根拠・対象時期・出典は選定時の値をそのまま使い、
// 見出し・固定3観点(sections)だけを生成結果から取る。予測IDは`<genre>--<horizon>`とする
// (article-detail/design.md「前提: 記事データの形式」)。この機能以降に生成する記事は常に
// CurrentPrediction(sections形式)になる(LegacyPrediction〈body形式〉は過去記事専用)
export function buildPrediction(candidate: Candidate, generated: GeneratedContent): CurrentPrediction {
  return {
    id: `${candidate.genre}--${candidate.horizon}`,
    genre: candidate.genre,
    horizon: candidate.horizon,
    heading: generated.heading,
    sections: generated.sections,
    impact: candidate.impact,
    impactReason: candidate.impactReason,
    targetPeriod: candidate.targetPeriod,
    sourceTitle: candidate.sourceTitle,
    sourceName: candidate.sourceName,
    sourceUrl: candidate.sourceUrl,
  }
}
