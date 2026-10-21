import { describe, it, expect } from 'vitest'
import { shouldNotify } from '../../../app/lib/digestFailureNotification/shouldNotify'

// 仕様: specs/digest-failure-notification/requirements.md#通知タイミング-1
describe('失敗通知の判定 - 自動再実行の仕組みを持たないワークフローは失敗したら直ちに通知する', () => {
  it('「AI駆動開発ダイジェスト 日次記事公開」が失敗した場合、直ちに通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: 'AI駆動開発ダイジェスト 日次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-21T00:43:00Z',
    })

    expect(result).toEqual({ notify: true, reason: 'immediate' })
  })

  it('「重要ニュース週刊ダイジェスト 週次記事公開」が失敗した場合、直ちに通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: '重要ニュース週刊ダイジェスト 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-21T00:43:00Z',
    })

    expect(result).toEqual({ notify: true, reason: 'immediate' })
  })

  it('「トレンドダイジェスト 週次記事公開」が失敗した場合、直ちに通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: 'トレンドダイジェスト 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-21T00:43:00Z',
    })

    expect(result).toEqual({ notify: true, reason: 'immediate' })
  })
})

// 仕様: specs/digest-failure-notification/requirements.md#通知タイミング-3
describe('失敗通知の判定 - 自動再実行の仕組みを持つワークフローでも、手動実行(workflow_dispatch)の失敗は再実行の対象外として直ちに通知する', () => {
  it('「研究発見 週次記事公開」がworkflow_dispatchで失敗した場合、直ちに通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: '研究発見 週次記事公開',
      conclusion: 'failure',
      event: 'workflow_dispatch',
      createdAt: '2026-10-21T00:43:00Z',
    })

    expect(result).toEqual({ notify: true, reason: 'manual' })
  })

  it('「週刊未来予測 週次記事公開」がworkflow_dispatchで失敗した場合、直ちに通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: '週刊未来予測 週次記事公開',
      conclusion: 'failure',
      event: 'workflow_dispatch',
      createdAt: '2026-10-21T00:43:00Z',
    })

    expect(result).toEqual({ notify: true, reason: 'manual' })
  })
})

// 仕様: specs/digest-failure-notification/requirements.md#通知タイミング-2
describe('失敗通知の判定 - 自動再実行の仕組みを持つワークフローは、最後の再実行(本番の36時間後)の失敗だけ通知する', () => {
  it('「研究発見 週次記事公開」(からだ・くらし編、火曜04:43 UTC)が最後の再実行の時刻ちょうどに失敗した場合、通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: '研究発見 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-20T04:43:00Z',
    })

    expect(result).toEqual({ notify: true, reason: 'final-retry' })
  })

  it('「研究発見 週次記事公開」(からだ・くらし編)が最後の再実行の時刻から許容誤差(80分)以内に失敗した場合、通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: '研究発見 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-20T06:03:00Z', // 火曜04:43 UTC + 80分
    })

    expect(result).toEqual({ notify: true, reason: 'final-retry' })
  })

  it('「研究発見 週次記事公開」(科学・社会編、日曜08:43 UTC)が最後の再実行の時刻ちょうどに失敗した場合、通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: '研究発見 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-18T08:43:00Z',
    })

    expect(result).toEqual({ notify: true, reason: 'final-retry' })
  })

  it('「週刊未来予測 週次記事公開」(サイエンス・テクノロジー編、金曜04:43 UTC)が最後の再実行の時刻ちょうどに失敗した場合、通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: '週刊未来予測 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-23T04:43:00Z',
    })

    expect(result).toEqual({ notify: true, reason: 'final-retry' })
  })

  it('「週刊未来予測 週次記事公開」(くらし・社会編、月曜06:43 UTC)が最後の再実行の時刻ちょうどに失敗した場合、通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: '週刊未来予測 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-19T06:43:00Z',
    })

    expect(result).toEqual({ notify: true, reason: 'final-retry' })
  })

  it('「週刊未来予測 週次記事公開」(くらし・社会編)が最後の再実行の時刻から許容誤差(80分)以内に失敗した場合、通知対象と判定されること', () => {
    const result = shouldNotify({
      workflowName: '週刊未来予測 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-19T08:03:00Z', // 月曜06:43 UTC + 80分
    })

    expect(result).toEqual({ notify: true, reason: 'final-retry' })
  })
})

// 仕様: specs/digest-failure-notification/requirements.md#通知タイミング-2
describe('失敗通知の判定 - 自動再実行の仕組みを持つワークフローは、最後の再実行以外(本番・12時間後・24時間後)の失敗では通知しない', () => {
  it('「研究発見 週次記事公開」(からだ・くらし編)が本番の失敗の場合、通知せず様子見と判定されること', () => {
    const result = shouldNotify({
      workflowName: '研究発見 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-18T16:43:00Z', // 日曜16:43 UTC(本番)
    })

    expect(result).toEqual({ notify: false, reason: 'retry-in-progress' })
  })

  it('「研究発見 週次記事公開」(からだ・くらし編)が本番の12時間後の再実行の失敗の場合、通知せず様子見と判定されること', () => {
    const result = shouldNotify({
      workflowName: '研究発見 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-19T04:43:00Z', // 月曜04:43 UTC(12時間後の再実行)
    })

    expect(result).toEqual({ notify: false, reason: 'retry-in-progress' })
  })

  it('「研究発見 週次記事公開」(からだ・くらし編)が本番の24時間後の再実行の失敗の場合、通知せず様子見と判定されること', () => {
    const result = shouldNotify({
      workflowName: '研究発見 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-19T16:43:00Z', // 月曜16:43 UTC(24時間後の再実行)
    })

    expect(result).toEqual({ notify: false, reason: 'retry-in-progress' })
  })

  it('「研究発見 週次記事公開」(からだ・くらし編)の最後の再実行の時刻(火曜04:43 UTC)から許容誤差(90分)を超えて外れた失敗の場合、通知せず様子見と判定されること', () => {
    const result = shouldNotify({
      workflowName: '研究発見 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-20T06:14:00Z', // 火曜04:43 UTC + 91分(許容誤差の境界外)
    })

    expect(result).toEqual({ notify: false, reason: 'retry-in-progress' })
  })

  it('「週刊未来予測 週次記事公開」(サイエンス・テクノロジー編)が本番の失敗の場合、通知せず様子見と判定されること', () => {
    const result = shouldNotify({
      workflowName: '週刊未来予測 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-21T16:43:00Z', // 水曜16:43 UTC(本番)
    })

    expect(result).toEqual({ notify: false, reason: 'retry-in-progress' })
  })

  it('「週刊未来予測 週次記事公開」(サイエンス・テクノロジー編)が本番の12時間後の再実行の失敗の場合、通知せず様子見と判定されること', () => {
    const result = shouldNotify({
      workflowName: '週刊未来予測 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-22T04:43:00Z', // 木曜04:43 UTC(12時間後の再実行)
    })

    expect(result).toEqual({ notify: false, reason: 'retry-in-progress' })
  })

  it('「週刊未来予測 週次記事公開」(サイエンス・テクノロジー編)が本番の24時間後の再実行の失敗の場合、通知せず様子見と判定されること', () => {
    const result = shouldNotify({
      workflowName: '週刊未来予測 週次記事公開',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-22T16:43:00Z', // 木曜16:43 UTC(24時間後の再実行)
    })

    expect(result).toEqual({ notify: false, reason: 'retry-in-progress' })
  })
})

// 仕様: specs/digest-failure-notification/design.md#エラーハンドリング
describe('失敗通知の判定 - 失敗以外のconclusion・想定外のワークフロー名・対象ワークフロー自身のCI失敗ジョブでは通知しない(防御的ケース)', () => {
  it('conclusionがsuccess(成功)の場合、通知しないと判定されること', () => {
    const result = shouldNotify({
      workflowName: 'AI駆動開発ダイジェスト 日次記事公開',
      conclusion: 'success',
      event: 'schedule',
      createdAt: '2026-10-21T00:43:00Z',
    })

    expect(result).toEqual({ notify: false, reason: 'not-failure' })
  })

  it('conclusionがcancelled(キャンセル)の場合、通知しないと判定されること', () => {
    const result = shouldNotify({
      workflowName: 'AI駆動開発ダイジェスト 日次記事公開',
      conclusion: 'cancelled',
      event: 'schedule',
      createdAt: '2026-10-21T00:43:00Z',
    })

    expect(result).toEqual({ notify: false, reason: 'not-failure' })
  })

  it('将来の名称変更等により対象5ワークフローのいずれにも一致しない未知のワークフロー名の場合、通知しないと判定されること', () => {
    const result = shouldNotify({
      workflowName: '未知のワークフロー',
      conclusion: 'failure',
      event: 'schedule',
      createdAt: '2026-10-21T00:43:00Z',
    })

    expect(result).toEqual({ notify: false, reason: 'unknown-workflow' })
  })

  it('即時通知グループ(「AI駆動開発ダイジェスト 日次記事公開」)が、対象ワークフロー自身のrecord-ci-failureジョブの失敗(起動要因workflow_run)で失敗扱いになった場合、記事生成の失敗ではないため通知しないと判定されること', () => {
    const result = shouldNotify({
      workflowName: 'AI駆動開発ダイジェスト 日次記事公開',
      conclusion: 'failure',
      event: 'workflow_run',
      createdAt: '2026-10-21T00:43:00Z',
    })

    expect(result).toEqual({ notify: false, reason: 'ci-related' })
  })

  it('再実行グループ(「研究発見 週次記事公開」)が、対象ワークフロー自身のrecord-ci-failureジョブの失敗(起動要因workflow_run)で失敗扱いになった場合、記事生成の失敗ではないため通知しないと判定されること', () => {
    const result = shouldNotify({
      workflowName: '研究発見 週次記事公開',
      conclusion: 'failure',
      event: 'workflow_run',
      createdAt: '2026-10-21T00:43:00Z',
    })

    expect(result).toEqual({ notify: false, reason: 'ci-related' })
  })
})
