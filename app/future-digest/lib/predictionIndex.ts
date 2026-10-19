import type { Article, Genre, Horizon } from './types'

export type PredictionIndexEntry = { heading: string; genre: Genre; horizon: Horizon }

// 全記事から「記事ID:予測ID」→見出し・ジャンル・時間軸の索引を作る
// (仕様: requirements.md#付箋の一覧-10、design.md「付箋一覧を表示する処理」手順3)。
// 付箋一覧ページで、保存されたarticleId・predictionIdから表示用の見出し・ジャンル・時間軸を
// 引き当てるために使う。掲載できなかった枠(emptySlots)には対象の予測が存在しないため、
// 索引には含めない。対応する予測が見つからない場合(記事データから消えた等)はキー自体が
// 存在しないため、呼び出し元はundefinedを見てその項目を一覧から除外できる
export function buildPredictionIndex(articles: Article[]): Record<string, PredictionIndexEntry> {
  const index: Record<string, PredictionIndexEntry> = {}
  for (const article of articles) {
    for (const prediction of article.predictions) {
      index[`${article.id}:${prediction.id}`] = {
        heading: prediction.heading,
        genre: prediction.genre,
        horizon: prediction.horizon,
      }
    }
  }
  return index
}
