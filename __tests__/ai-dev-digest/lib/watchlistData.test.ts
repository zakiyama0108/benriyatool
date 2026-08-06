import { describe, it, expect } from 'vitest'
import watchlistData from '../../../content/ai-dev-digest/watchlist.json'
import criteriaData from '../../../content/ai-dev-digest/criteria.json'
import type { WatchlistEntry, Criteria } from '../../../app/ai-dev-digest/lib/watchlistTypes'

const watchlist = watchlistData as WatchlistEntry[]
const criteria: Criteria = criteriaData

const EXPECTED_NAMES = [
  'Anthropic',
  'OpenAI',
  'LangChain',
  'AWS',
  'DeepLearning.AI',
  'Andrej Karpathy',
  'Fireship',
  'Cole Medin',
  'freeCodeCamp',
  'Dave Ebbelaar',
  'Simon Willison',
  'Qiita',
  'Zenn',
]

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-1、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Anthropic、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-OpenAI、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-LangChain、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-AWS、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-DeepLearning.AI、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-AndrejKarpathy、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Fireship、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-ColeMedin、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-freeCodeCamp、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-DaveEbbelaar、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-SimonWillison、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Qiita、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Zenn
describe('情報源ウォッチリストのデータ - requirements.mdの表と完全一致する13件の固定リストであること', () => {
  it('ウォッチリストがちょうど13件であること(記載以外の情報源をエージェントが自律的に追加しない固定リスト運用)', () => {
    expect(watchlist).toHaveLength(13)
  })

  for (const name of EXPECTED_NAMES) {
    it(`「${name}」がウォッチリストに含まれること`, () => {
      expect(watchlist.some((entry) => entry.name === name)).toBe(true)
    })
  }
})

// 仕様: specs/ai-dev-digest/content-selection/design.md#データ設計(ウォッチリスト・採用基準)
// criteria.jsonの値はwatchlist-reviewの月次見直しで運用実績を見て更新されることが前提のデータ
// (design.md「criteria.jsonの初期値」参照)のため、特定時点の値をtoEqualで固定せず、
// 常に成り立つべき構造上の妥当性(範囲・符号)のみを検証する
describe('採用基準データの構造 - watchlist-reviewによる更新後も常に成り立つべき妥当性', () => {
  it('dailyTopicCountがmin以上maxで、両方とも正の整数であること', () => {
    expect(Number.isInteger(criteria.dailyTopicCount.min)).toBe(true)
    expect(Number.isInteger(criteria.dailyTopicCount.max)).toBe(true)
    expect(criteria.dailyTopicCount.min).toBeGreaterThan(0)
    expect(criteria.dailyTopicCount.max).toBeGreaterThanOrEqual(criteria.dailyTopicCount.min)
  })

  it('YouTube・Qiita・Zennの各種閾値が妥当な範囲(正の数、平均超過倍率は1倍超)であること', () => {
    expect(criteria.youtubeRecentVideoWindow).toBeGreaterThan(0)
    expect(criteria.youtubeAboveAverageRatio).toBeGreaterThan(1)
    expect(criteria.qiitaMinLikes).toBeGreaterThanOrEqual(0)
    expect(criteria.zennMinLikes).toBeGreaterThanOrEqual(0)
  })
})
