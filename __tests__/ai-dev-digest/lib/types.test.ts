import { describe, it, expect } from 'vitest'
import { isLegacyTopic, hasDomainPerspective } from '../../../app/ai-dev-digest/lib/types'
import type {
  LegacyTopic,
  CurrentTopic,
  TopicSummaryWithDomain,
  TopicSummaryWithWhatsNew,
} from '../../../app/ai-dev-digest/lib/types'

function makeLegacyTopic(): LegacyTopic {
  return {
    id: 'topic-1',
    heading: '見出し',
    sections: [
      { heading: 'S1', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
      { heading: 'S2', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
    ],
    sourceType: 'official',
    sourceName: 'Anthropic',
    sourceUrl: 'https://example.com/a',
    belowCriteria: false,
  }
}

function makeCurrentTopic(): CurrentTopic {
  return {
    id: 'topic-1',
    heading: '見出し',
    summary: {
      benefit: { heading: 'b', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(250) },
      whatsNew: { heading: 'w', teaser: 'い'.repeat(60), detail: 'い'.repeat(250) },
      how: { heading: 'h', teaser: 'う'.repeat(60), detail: 'う'.repeat(250) },
      howToUse: { heading: 'u', teaser: 'え'.repeat(60), detail: 'え'.repeat(250) },
    },
    importance: 4,
    sourceType: 'official',
    sourceName: 'Anthropic',
    sourceUrl: 'https://example.com/a',
    belowCriteria: false,
  }
}

// 仕様: specs/ai-dev-digest/article-detail/design.md#前提: 記事データの形式(この機能が定義する共有スキーマ)
describe('isLegacyTopic - sectionsキーの有無でLegacyTopic(旧形式)/CurrentTopic(新形式)を判定する', () => {
  it('sectionsキーを持つTopicオブジェクトに対してtrueを返すこと', () => {
    expect(isLegacyTopic(makeLegacyTopic())).toBe(true)
  })

  it('summaryキーを持つTopicオブジェクトに対してfalseを返すこと', () => {
    expect(isLegacyTopic(makeCurrentTopic())).toBe(false)
  })
})

function makeSummaryWithDomain(): TopicSummaryWithDomain {
  return {
    domain: { heading: 'd', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(250), domains: ['backend'] },
    benefit: { heading: 'b', teaser: 'い'.repeat(60), detail: 'い'.repeat(250) },
    how: { heading: 'h', teaser: 'う'.repeat(60), detail: 'う'.repeat(250) },
    howToUse: { heading: 'u', teaser: 'え'.repeat(60), detail: 'え'.repeat(250) },
  }
}

function makeSummaryWithWhatsNew(): TopicSummaryWithWhatsNew {
  return {
    benefit: { heading: 'b', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(250) },
    whatsNew: { heading: 'w', teaser: 'い'.repeat(60), detail: 'い'.repeat(250) },
    how: { heading: 'h', teaser: 'う'.repeat(60), detail: 'う'.repeat(250) },
    howToUse: { heading: 'u', teaser: 'え'.repeat(60), detail: 'え'.repeat(250) },
  }
}

// 仕様: specs/ai-dev-digest/article-detail/design.md#前提: 記事データの形式(この機能が定義する共有スキーマ)
describe('hasDomainPerspective - domainキーの有無でTopicSummaryWithDomain(新形式)/TopicSummaryWithWhatsNew(旧形式)を判定する', () => {
  it('domainキーを持つsummaryに対してtrueを返すこと', () => {
    expect(hasDomainPerspective(makeSummaryWithDomain())).toBe(true)
  })

  it('whatsNewキーを持つsummaryに対してfalseを返すこと', () => {
    expect(hasDomainPerspective(makeSummaryWithWhatsNew())).toBe(false)
  })
})
