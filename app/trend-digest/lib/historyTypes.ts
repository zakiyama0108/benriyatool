// トレンド継続履歴の型定義(仕様: trend-history/design.md「履歴データの形式」)。
// 本来はtrend-history spec自身が実装するファイルだが、article-detailのtypes.tsが
// DurationLabel/HeatLabelを参照するために先行して型定義のみを用意する(ロジックは持たない。
// trend-history実装時にObservation関連の処理はこのファイルの型を使って実装される)。
// historyTypes.ts と types.ts・watchlistTypes.ts は型を相互に参照する
// (historyTypes→Edition/Genre・SelectionMethod、types→DurationLabel/HeatLabel、watchlistTypes→HistoryCriteria)。
// すべて`import type`のため実行時には循環が残らない

import type { Edition, Genre } from './types' // article-detail/design.mdが定義する型を再利用(重複定義しない)
import type { SelectionMethod } from './watchlistTypes'

// 継続度ラベル(trend-history/requirements.md#継続度ラベル-1〜4)。「どれだけ続いているか」を表す
export type DurationLabel = 'pre-trend' | 'emerging' | 'talked' | 'highly-talked'

// 注目度ラベル(trend-history/requirements.md#注目度ラベル-8〜9)。「今どれくらい強いか」を表す
export type HeatLabel = 'high' | 'normal' | 'low'

// 継続度ラベルの強さの順(並べ替えの比較に使う。大きいほど長く続いている)。
// 画面表示用の日本語ラベルはarticle-detail/design.mdが持つ(表示の責務がそちらにあるため)
export const DURATION_LABEL_ORDER: Record<DurationLabel, number> = {
  'pre-trend': 0,
  emerging: 1,
  talked: 2,
  'highly-talked': 3,
}

// 注目度ラベルの強さの順(同上。大きいほど今強い)
export const HEAT_LABEL_ORDER: Record<HeatLabel, number> = { low: 0, normal: 1, high: 2 }

// その回に観測した項目1件分。採用基準を満たすかどうかの判定前の全項目を記録する(requirements.md#機能要件-1〜3)
export type Observation = {
  genre: Genre
  title: string // 原題(content-selectionのCandidate.titleをそのまま引き継ぐ)
  strength: number // その回の強さを表す値。固定リストは`(記録上限 + 1) - 順位`(上位ほど大きい。上限30なら1位=30・30位=1)、
                   // WebSearchは独立した言及元の数。**content-selectionが並べ替えに使う`strength`(固定リストは`100 - 順位`)とは別の値**で、
                   // 記録上限の中で必ず1以上になるよう張り直したもの(`100 - 順位`をそのまま使うと101位以降で負になりバリデーションを通らないため)
  meetsCriteria: boolean // その回にcontent-selectionの採用基準を満たしたか(requirements.md#機能要件-2)。
                         // 満たさなかった項目も記録するため、候補の有無をcontent-selection・source-reviewが見分けられるように残す
  rank: number | null // 固定リストジャンルの項目のその回の順位(1が最上位。記録上限以内)。WebSearchジャンルはnull。
                      // strengthから逆算せず順位そのものを持つ(musicのような上昇幅加点があるジャンルでは`100 - strength`が実際の順位と一致しないため)
  method: SelectionMethod
  originRegion: string | null // 発祥地域。判定できない場合はnull(=不明。requirements.md#地域情報-15)
  currentRegions: string[] // 現在の主な流行地域。判定できない場合は空配列(=不明)
  strengthJapan: number | null // 日本の情報源での言及数。判定できない場合はnull
  strengthOverseas: number | null // 海外の情報源での言及数。判定できない場合はnull
}

// 1回の実行分の観測ログ(1ファイルの中身)
export type ObservationLog = {
  date: string // YYYY-MM-DD。実行日
  edition: Edition
  observations: Observation[] // その回の全観測項目。0件(全ジャンルで何も取れなかった回)もありうる
}

// 全観測ログを話題単位に集約した系列(ファイルには保存せず、実行のたびに再計算する)
export type CandidateHistory = {
  normalizedTitle: string // 同一性判定のキー。ジャンルは含めない(requirements.md#機能要件-4)
  latestTitle: string // 表示・突合用の原題(直近の観測のもの)
  latestGenre: Genre // 直近に観測されたジャンル
  latestMethod: SelectionMethod // 直近の観測の選定方式(注目度ラベルの判定に使う)
  latestStrength: number // 直近の観測の強さ(注目度ラベルの判定に使う)
  latestRank: number | null // 直近の観測の順位(固定リストジャンルのみ。注目度ラベルの判定に使う)
  firstDetectedDate: string // 初回検知日(途切れを挟んだ通算の最古。表示には使わず、運用状況の確認用に残す)
  lastDetectedDate: string // 直近検知日
  continuationStartDate: string // 途切れずに検知され続けている期間の開始日(design.md「途切れずに続いている期間を求める処理」)
  continuationDays: number // continuationStartDateからlastDetectedDateまでの日数。初検知のみなら0
  detectionCount: number // 検知した実行回数(途切れを挟んだ通算。選定方式・編をまたいで1回と数える)
  observedEditions: Edition[] // この話題が観測された編(両編のジャンルで観測される話題は2件になる)
  originRegion: string | null
  currentRegions: string[]
  strengthJapan: number | null
  strengthOverseas: number | null
}

// 話題1件分の判定結果。content-selectionへ渡す単位。
// 掲載可否そのものは持たせない。履歴側は事実(ラベル・継続日数・掲載実績)の提供にとどめ、
// どれを載せるかの判断はcontent-selectionが行う(requirements.md#継続度ラベル-7、同#注目度ラベル-12)
export type HistoryJudgement = {
  durationLabel: DurationLabel
  heatLabel: HeatLabel
  heatBasis: 'distribution' | 'source-position' // 注目度をどちらの方法で決めたか(ログ・月次見直し用)
  continuationDays: number
  continuationStartDate: string
  detectionCount: number
  publishedCount: number // 過去に記事へ掲載された回数(未掲載は0。requirements.md#掲載実績の追跡-13)
  reportCount: number // 今回掲載する場合に通算何回目の報告になるか(= publishedCount + 1)
  lastPublishedDurationLabel: DurationLabel | null // 直近掲載時の継続度ラベル。未掲載・判定不能はnull(requirements.md#掲載実績の追跡-14)
}

// 継続度・注目度の判定に使う日数・件数(content/trend-digest/criteria.jsonの`history`として持つ。
// 値の意味は本来trend-history specが所有するが、型はarticle-detailのtypes.tsが必要とするため先行して定義する)
export type HistoryCriteria = {
  emergingMinDays: number // 「注目され始め」とみなす継続日数の下限(requirements.md#継続度ラベル-2 = 14。半月)
  talkedMinDays: number // 「話題」とみなす継続日数の下限(同-3 = 30。1ヶ月)
  highlyTalkedMinDays: number // 「非常に話題」とみなす継続日数の下限(同-4 = 90。3ヶ月)
  maxObservationsPerSource: number // 1つの情報源から観測ログに記録する項目数の上限(requirements.md#機能要件-3)
  heatMinObservationRuns: number // 注目度を過去の分布で決めるのに必要な、そのジャンルの実行回数(requirements.md#注目度ラベル-8、同-10)
  heatRankHigh: number // 固定リストジャンル用。この順位以内なら注目度「高い」(同-9)
  heatRankNormal: number // 固定リストジャンル用。この順位以内なら注目度「普通」(同-9)
  heatSourcesHigh: number // WebSearchジャンル用。独立言及元がこの件数以上なら注目度「高い」(同-9)
  heatSourcesNormal: number // WebSearchジャンル用。独立言及元がこの件数以上なら注目度「普通」(同-9)
}
