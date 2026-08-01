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
describe('採用基準の初期値データ - design.mdが定める初期値どおりに設定されていること', () => {
  it('criteria.jsonがdesign.mdの初期値(1日3〜5件、直近10本、1.2倍、Qiita/Zennともにいいね30)と一致すること', () => {
    expect(criteria).toEqual({
      dailyTopicCount: { min: 3, max: 5 },
      youtubeRecentVideoWindow: 10,
      youtubeAboveAverageRatio: 1.2,
      qiitaMinLikes: 30,
      zennMinLikes: 30,
    })
  })
})
