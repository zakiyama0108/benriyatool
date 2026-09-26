import { describe, it, expect } from 'vitest'
import { parseAgentJudgment, toJudgedCandidates } from '../../../app/news-digest/lib/judgeCandidates'
import type { AgentJudgedItem } from '../../../app/news-digest/lib/judgeCandidates'
import type { Candidate } from '../../../app/news-digest/lib/candidateTypes'

const validItem: AgentJudgedItem = {
  heading: 'テスト見出し',
  category: 'general',
  sourceName: 'NHK NEWS WEB(政治・国際)',
  sourceUrl: 'https://example.com/news/a',
  sourcePublishedAt: '2026-09-10T00:00:00Z',
  meetsCriteria: true,
  corroboratingSources: ['NHK NEWS WEB(政治・国際)', '共同通信'],
}

// 仕様: specs/news-digest/content-selection/design.md#候補をグループ化し採用基準を判定する処理(エージェントの推論)
describe('エージェント応答のJSONパース・フォールバック - 指定形式で応答しなかった場合は例外を投げず候補なし扱いにする', () => {
  it('指定のJSON配列形式で正しく応答した場合、その内容がそのまま配列として得られること', () => {
    const responseText = `分析結果です:\n${JSON.stringify([validItem])}\n以上です。`
    expect(parseAgentJudgment(responseText)).toEqual([validItem])
  })

  it('応答にJSON配列が含まれない場合、例外を投げずに空配列(候補なし)を返すこと', () => {
    expect(() => parseAgentJudgment('すみません、判断できませんでした')).not.toThrow()
    expect(parseAgentJudgment('すみません、判断できませんでした')).toEqual([])
  })

  it('JSONとして壊れた文字列が含まれる場合も、例外を投げずに空配列(候補なし)を返すこと', () => {
    expect(parseAgentJudgment('[{"heading": "壊れたJSON",]')).toEqual([])
  })

  it('配列の要素が指定フィールドを満たさない場合、その要素だけを除外すること', () => {
    const invalidItem = { heading: '', category: 'general' }
    const responseText = JSON.stringify([validItem, invalidItem])
    expect(parseAgentJudgment(responseText)).toEqual([validItem])
  })
})

describe('エージェント判定結果と収集済み候補の突き合わせ - 収集していない情報源の話題は採用しない', () => {
  it('エージェント応答の元URLが収集済み候補に存在する場合、収集時の情報(sourceId等)を保ったJudgedCandidateになること', () => {
    const collected: Candidate[] = [
      { sourceId: 'nhk-news-web', sourceName: 'NHK NEWS WEB(政治・国際)', category: 'general', heading: '元見出し', url: 'https://example.com/news/a/', publishedAt: '2026-09-10T00:00:00Z' },
    ]

    const result = toJudgedCandidates([validItem], collected)

    expect(result).toEqual([
      {
        sourceId: 'nhk-news-web',
        sourceName: 'NHK NEWS WEB(政治・国際)',
        category: 'general',
        heading: '元見出し',
        url: 'https://example.com/news/a/',
        publishedAt: '2026-09-10T00:00:00Z',
        meetsCriteria: true,
        corroboratingSources: ['NHK NEWS WEB(政治・国際)', '共同通信'],
      },
    ])
  })

  it('エージェント応答の元URLが収集済み候補のどれとも一致しない場合、その項目を除外すること(固定リストにない話題の創作を防ぐ)', () => {
    const collected: Candidate[] = [
      { sourceId: 'nhk-news-web', sourceName: 'NHK NEWS WEB(政治・国際)', category: 'general', heading: '元見出し', url: 'https://example.com/news/other', publishedAt: '2026-09-10T00:00:00Z' },
    ]

    expect(toJudgedCandidates([validItem], collected)).toEqual([])
  })
})
