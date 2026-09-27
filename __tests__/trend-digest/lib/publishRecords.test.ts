import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { collectPublishRecords, lookupPublishRecord } from '../../../app/trend-digest/lib/publishRecords'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trend-history-publish-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeArticle(filename: string, article: unknown): void {
  fs.writeFileSync(path.join(tmpDir, filename), JSON.stringify(article))
}

function topicWithTrend(sourceTitle: string, durationLabel: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 'topic-1',
    genre: 'music',
    heading: '見出し',
    body: 'あ'.repeat(200),
    sourceTitle,
    sourceName: '出典',
    sourceUrl: 'https://example.com/x',
    trend: {
      durationLabel,
      heatLabel: 'normal',
      continuationDays: 10,
      continuationStartDate: '2026-09-01',
      reportCount: 1,
      originRegion: null,
      currentRegions: [],
    },
    ...overrides,
  }
}

// 仕様: specs/trend-digest/trend-history/requirements.md#掲載実績の追跡-13、specs/trend-digest/trend-history/requirements.md#掲載実績の追跡-14
describe('掲載実績(掲載回数・報告回数・直近掲載時の継続度ラベル)の算出(collectPublishRecords)', () => {
  it('同じ正規化タイトルの掲載回数が数えられ、今回の報告回数が「過去の掲載回数+1」になること', () => {
    writeArticle('2026-09-01-entertainment.json', {
      id: '2026-09-01-entertainment',
      edition: 'entertainment',
      date: '2026-09-01',
      topics: [topicWithTrend('新曲A', 'pre-trend')],
    })
    writeArticle('2026-09-08-entertainment.json', {
      id: '2026-09-08-entertainment',
      edition: 'entertainment',
      date: '2026-09-08',
      topics: [topicWithTrend(' 新曲a ', 'emerging')],
    })

    const records = collectPublishRecords(tmpDir)
    const record = lookupPublishRecord(records, '新曲a')
    expect(record.publishedCount).toBe(2)
    expect(record.reportCount).toBe(3)
  })

  it('直近で掲載されたときの継続度ラベルが、最も新しい掲載トピックのものになること', () => {
    writeArticle('2026-09-01-entertainment.json', {
      id: '2026-09-01-entertainment',
      edition: 'entertainment',
      date: '2026-09-01',
      topics: [topicWithTrend('新曲A', 'pre-trend')],
    })
    writeArticle('2026-09-08-entertainment.json', {
      id: '2026-09-08-entertainment',
      edition: 'entertainment',
      date: '2026-09-08',
      topics: [topicWithTrend('新曲A', 'talked')],
    })

    const records = collectPublishRecords(tmpDir)
    const record = lookupPublishRecord(records, '新曲a')
    expect(record.lastPublishedDurationLabel).toBe('talked')
  })

  it('trendを持たない過去記事しかない場合、直近掲載時の継続度ラベルが「不明」(null)になること', () => {
    writeArticle('2026-09-01-entertainment.json', {
      id: '2026-09-01-entertainment',
      edition: 'entertainment',
      date: '2026-09-01',
      topics: [
        {
          id: 'topic-1',
          genre: 'music',
          heading: '見出し',
          body: 'あ'.repeat(200),
          sourceTitle: '新曲A',
          sourceName: '出典',
          sourceUrl: 'https://example.com/x',
        },
      ],
    })

    const records = collectPublishRecords(tmpDir)
    const record = lookupPublishRecord(records, '新曲a')
    expect(record.publishedCount).toBe(1)
    expect(record.lastPublishedDurationLabel).toBeNull()
  })

  it('一度も掲載されていない話題は、掲載回数0・報告回数1・直近掲載時のラベルnullになること', () => {
    const records = collectPublishRecords(tmpDir)
    const record = lookupPublishRecord(records, '未掲載の話題')
    expect(record).toEqual({ publishedCount: 0, reportCount: 1, lastPublishedDurationLabel: null })
  })
})
