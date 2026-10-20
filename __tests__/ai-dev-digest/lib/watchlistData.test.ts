import { describe, it, expect } from 'vitest'
import watchlistData from '../../../content/ai-dev-digest/watchlist.json'
import criteriaData from '../../../content/ai-dev-digest/criteria.json'
import type { WatchlistEntry, Criteria } from '../../../app/ai-dev-digest/lib/watchlistTypes'

const watchlist = watchlistData as WatchlistEntry[]
// criteria.jsonのimportはduplicateSuppressionSourceTypesがstring[]と推論されるため、
// SourceType[]を要求するCriteria型へ明示的にアサートする(watchlist行と同じ扱い)
const criteria = criteriaData as Criteria

const EXPECTED_NAMES = [
  'Anthropic',
  'OpenAI',
  'LangChain',
  'AWS',
  'DeepLearning.AI',
  'GitHub',
  'Google Developers',
  'VS Code',
  'Hugging Face Blog',
  'Google DeepMind',
  'Mistral AI',
  'Microsoft AI (Source)',
  'Andrej Karpathy',
  'Fireship',
  'Cole Medin',
  'freeCodeCamp',
  'Dave Ebbelaar',
  'Two Minute Papers',
  'Yannic Kilcher',
  'IndyDevDan',
  'AICodeKing',
  'Simon Willison',
  'Interconnects (Nathan Lambert)',
  'Martin Fowler / Thoughtworks',
  'Chip Huyen',
  'Latent Space',
  'Qiita',
  'Zenn',
  'Hugging Face Papers',
]

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-1、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Anthropic、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-OpenAI、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-LangChain、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-AWS、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-DeepLearning.AI、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-GitHub、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Google Developers、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-VS Code、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Hugging Face Blog、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Google DeepMind、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Mistral AI、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Microsoft AI (Source)、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Andrej Karpathy、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Fireship、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Cole Medin、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-freeCodeCamp、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Dave Ebbelaar、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Two Minute Papers、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Yannic Kilcher、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-IndyDevDan、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-AICodeKing、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Simon Willison、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Interconnects (Nathan Lambert)、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Martin Fowler / Thoughtworks、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Chip Huyen、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Latent Space、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Qiita、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Zenn、specs/ai-dev-digest/content-selection/requirements.md#情報源(ウォッチリスト)-Hugging Face Papers
describe('情報源ウォッチリストのデータ - requirements.mdの表と完全一致する29件の固定リストであること', () => {
  it('ウォッチリストがちょうど29件であること(記載以外の情報源をエージェントが自律的に追加しない固定リスト運用)', () => {
    expect(watchlist).toHaveLength(29)
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

  it('YouTube・Qiita・Zenn・Hugging Face Papersの各種閾値が妥当な範囲(正の数、平均超過倍率は1倍超)であること', () => {
    expect(criteria.youtubeRecentVideoWindow).toBeGreaterThan(0)
    expect(criteria.youtubeCandidateVideoCount).toBeGreaterThan(0)
    expect(criteria.youtubeAboveAverageRatio).toBeGreaterThan(1)
    expect(criteria.qiitaMinLikes).toBeGreaterThanOrEqual(0)
    expect(criteria.qiitaMaxAgeDays).toBeGreaterThan(0)
    expect(criteria.zennMinLikes).toBeGreaterThanOrEqual(0)
    expect(criteria.hfPapersMinUpvotes).toBeGreaterThanOrEqual(0)
    expect(criteria.minIndividualBlogBodyChars).toBeGreaterThan(0)
  })

  it('topicExcludeKeywordsが配列で、各要素が空文字でない文字列であること', () => {
    expect(Array.isArray(criteria.topicExcludeKeywords)).toBe(true)
    for (const keyword of criteria.topicExcludeKeywords) {
      expect(typeof keyword).toBe('string')
      expect(keyword.length).toBeGreaterThan(0)
    }
  })

  it('duplicateSuppressionSourceTypesが配列で、各要素がCandidate.sourceTypeとして有効な種別であること', () => {
    const validSourceTypes = ['official', 'individual-youtube', 'individual-blog', 'qiita', 'zenn', 'hf-papers']
    expect(Array.isArray(criteria.duplicateSuppressionSourceTypes)).toBe(true)
    for (const sourceType of criteria.duplicateSuppressionSourceTypes) {
      expect(validSourceTypes).toContain(sourceType)
    }
  })
})
