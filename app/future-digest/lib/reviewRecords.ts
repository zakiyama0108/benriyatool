import type { Article, Genre, Horizon } from './types'

// 月次見直しの材料集め(仕様: source-review/requirements.md#見直しの実行-1・5、
// design.md「見直しの材料を集める処理」手順1〜2)。
// design.mdは本ロジックをscripts/future-digest/collect-review-data/collectReviewData.tsに
// 置く想定だが、そのディレクトリは独立した依存関係(pg/dotenv)を持つ隔離パッケージのため
// 本体のtsconfigプロジェクトに含まれない(tsconfig.json参照)。DB非依存のこのロジック自体は
// 本体のvitestで完全にテストできるため、テスト可能性を保つ目的でapp/future-digest/lib/に置き、
// 隔離パッケージ側からはこのモジュールをimportして薄いCLIとして呼び出す
// (trend-digestのapp/trend-digest/lib/reviewRecords.tsと同じ設計判断)

export type EmptySlotSummary = {
  genre: Genre
  horizon: Horizon
  noCandidateCount: number // その枠が候補なしだった回数
  effectiveCount: number // その時間軸を扱った回のうち、収集失敗を除いた回数(「有効回数」)
  generationFailedCount: number // 生成に失敗した回数(候補の不足ではないため別集計。有効回数には含めない)
  ongoing: boolean // 有効回数が1回以上あり、そのすべての回で候補なしだった(続いている)かどうか
}

// 枠(ジャンル×時間軸)ごとの集計を積み上げる作業用の入れ物
type SlotAccumulator = {
  genre: Genre
  horizon: Horizon
  noCandidateCount: number
  effectiveCount: number
  generationFailedCount: number
}

function slotKey(genre: Genre, horizon: Horizon): string {
  return `${genre}--${horizon}`
}

// articlesのうちfrom〜to(両端含む)の期間の記事だけを対象に、枠(ジャンル×時間軸)ごとに
// 候補なしの回数・有効回数(収集失敗を除いた回数)・生成失敗の回数を集計する
// (design.md「見直しの材料を集める処理」手順1〜2)。
// 収集失敗(reason: 'collection-failed')は候補なしの回数にも有効回数にも数えない
// (content-selection/requirements.md#収集失敗-5)。生成失敗(reason: 'generation-failed')は
// 候補の不足ではないため候補なしとは別に数え、有効回数にも含めない。
// 有効回数が1回以上あり、そのすべての回で候補なしだった枠には「続いている」の印(ongoing)を付ける。
// 有効回数が0回(その時間軸を扱ったすべての回で収集に失敗した)枠には印を付けない
// (候補が本当に無かったのか判断できないため)
export function summarizeEmptySlots(articles: Article[], from: string, to: string): EmptySlotSummary[] {
  const targetArticles = articles.filter((article) => article.date >= from && article.date <= to)

  const accumulators = new Map<string, SlotAccumulator>()
  const getOrCreate = (genre: Genre, horizon: Horizon): SlotAccumulator => {
    const key = slotKey(genre, horizon)
    let acc = accumulators.get(key)
    if (!acc) {
      acc = { genre, horizon, noCandidateCount: 0, effectiveCount: 0, generationFailedCount: 0 }
      accumulators.set(key, acc)
    }
    return acc
  }

  for (const article of targetArticles) {
    // 採用された枠(1回でも採用された枠は「続いている」の対象から外れるが、有効回数には含める)
    for (const prediction of article.predictions) {
      const acc = getOrCreate(prediction.genre, prediction.horizon)
      acc.effectiveCount++
    }

    for (const emptySlot of article.emptySlots) {
      const acc = getOrCreate(emptySlot.genre, emptySlot.horizon)
      if (emptySlot.reason === 'collection-failed') {
        continue // 有効回数・候補なしのいずれにも数えない
      }
      if (emptySlot.reason === 'generation-failed') {
        acc.generationFailedCount++
        continue // 候補の不足ではないため有効回数・候補なしには数えない
      }
      // reason === 'no-candidate'
      acc.effectiveCount++
      acc.noCandidateCount++
    }
  }

  return [...accumulators.values()].map((acc) => ({
    ...acc,
    ongoing: acc.effectiveCount > 0 && acc.noCandidateCount === acc.effectiveCount,
  }))
}
