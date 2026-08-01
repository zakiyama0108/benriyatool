import path from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { collectBelowCriteriaRecords, collectFeedback } from '../../../app/ai-dev-digest/lib/reviewRecords'

const REVIEW_FIXTURES_DIR = path.join(__dirname, '../fixtures/articles-review')

// 仕様: specs/ai-dev-digest/watchlist-review/requirements.md#見直しの実行-1
describe('基準未達記録の集計 - 直近1ヶ月分の記事データからbelowCriteria:trueのトピックのみを抽出する', () => {
  it('集計期間内(sinceDate以降)の基準未達トピックのみが抽出されること(期間外のファイルは除外される)', () => {
    const records = collectBelowCriteriaRecords(REVIEW_FIXTURES_DIR, '2026-07-01')
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      date: '2026-08-01',
      topicId: 'topic-1',
      sourceType: 'qiita',
      sourceName: 'example-user',
      belowCriteriaReason: 'いいね数18件(基準30件に12件不足)',
    })
  })

  it('基準を満たしたトピック(belowCriteria: false)は集計対象から除外されること', () => {
    const records = collectBelowCriteriaRecords(REVIEW_FIXTURES_DIR, '2026-07-01')
    expect(records.some((r) => r.topicId === 'topic-2')).toBe(false)
  })

  it('集計期間を広げる(sinceDateを早める)と、期間外だったファイルも集計対象に含まれること', () => {
    const records = collectBelowCriteriaRecords(REVIEW_FIXTURES_DIR, '2026-01-01')
    expect(records).toHaveLength(2)
    expect(records.map((r) => r.date)).toEqual(expect.arrayContaining(['2026-08-01', '2026-06-01']))
  })

  it('記事データディレクトリが存在しない場合、空配列が返ること', () => {
    expect(collectBelowCriteriaRecords(path.join(__dirname, '../fixtures/does-not-exist'), '2026-01-01')).toEqual([])
  })
})

// 仕様: specs/ai-dev-digest/watchlist-review/design.md「見直しの材料を集める処理」
describe('フィードバックの取得 - 集計期間・is_test=falseの条件でai_dev_digest_feedbackをSELECTする', () => {
  it('sinceDate以降・is_test=falseの条件でクエリが実行され、結果がFeedbackRecordに変換されること', async () => {
    const executeQuery = vi.fn().mockResolvedValue([
      { article_date: '2026-08-01', topic_id: 'topic-1', comment: 'この選定はもう不要かもしれません' },
    ])

    const records = await collectFeedback('2026-07-01', executeQuery)

    expect(executeQuery).toHaveBeenCalledWith(expect.stringContaining('is_test = false'), ['2026-07-01'])
    expect(records).toEqual([{ articleDate: '2026-08-01', topicId: 'topic-1', comment: 'この選定はもう不要かもしれません' }])
  })
})
