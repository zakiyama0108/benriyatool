// 5アプリの記事生成ワークフローの失敗イベントが、LINEへの通知対象かどうかを判定する純粋関数
// (仕様: specs/digest-failure-notification/requirements.md#通知タイミング)。
import { isFinalRetrySlot } from './lastRetrySlots'

export type ShouldNotifyInput = {
  workflowName: string
  conclusion: string
  event: string
  createdAt: string // ISO 8601文字列(github.event.workflow_run.created_at、UTC)
}

export type ShouldNotifyResult = {
  notify: boolean
  reason: 'immediate' | 'manual' | 'final-retry' | 'retry-in-progress' | 'not-failure' | 'unknown-workflow' | 'ci-related'
}

// 自動再実行の仕組みを持たない3ワークフロー(requirements.md#通知タイミング-1)。
// 失敗が即時通知対象かどうかを判定するために名称で一致判定する
const IMMEDIATE_GROUP_WORKFLOW_NAMES = [
  'AI駆動開発ダイジェスト 日次記事公開',
  '重要ニュース週刊ダイジェスト 週次記事公開',
  'トレンドダイジェスト 週次記事公開',
]

// 自動再実行(最大3回、12/24/36時間後)の仕組みを持つ2ワークフロー(requirements.md#通知タイミング-2)。
// 最後の再実行を使い切ってなお失敗した場合のみ通知する
const RETRY_GROUP_WORKFLOW_NAMES = ['研究発見 週次記事公開', '週刊未来予測 週次記事公開']

export function shouldNotify(input: ShouldNotifyInput): ShouldNotifyResult {
  // 成功・キャンセル等(failure以外)は検知対象外(design.md「エラーハンドリング」)
  if (input.conclusion !== 'failure') {
    return { notify: false, reason: 'not-failure' }
  }

  if (IMMEDIATE_GROUP_WORKFLOW_NAMES.includes(input.workflowName)) {
    // schedule(定期実行)・workflow_dispatch(手動実行)は記事生成そのものの失敗。
    // workflow_runは対象ワークフロー自身が持つrecord-ci-failureジョブの失敗であり
    // 記事生成の失敗ではないため通知しない(design.md「エラーハンドリング」)
    if (input.event === 'schedule' || input.event === 'workflow_dispatch') {
      return { notify: true, reason: 'immediate' }
    }
    return { notify: false, reason: 'ci-related' }
  }

  if (RETRY_GROUP_WORKFLOW_NAMES.includes(input.workflowName)) {
    if (input.event === 'workflow_dispatch') {
      // 手動実行は再実行の仕組みの対象外のため直ちに通知する(requirements.md#通知タイミング-3)
      return { notify: true, reason: 'manual' }
    }

    if (input.event === 'schedule') {
      // 最後の再実行(本番の36時間後)の時刻スロットと一致した場合のみ通知し、本番・12時間後・
      // 24時間後の失敗では自動再実行に委ねて様子見する(requirements.md#通知タイミング-2)
      return isFinalRetrySlot(input.workflowName, input.createdAt)
        ? { notify: true, reason: 'final-retry' }
        : { notify: false, reason: 'retry-in-progress' }
    }

    // workflow_run(record-ci-failureジョブの失敗)は記事生成の失敗ではないため通知しない
    // (design.md「エラーハンドリング」)
    return { notify: false, reason: 'ci-related' }
  }

  // 将来ワークフロー名が変更され想定外の名前が来た場合、防御的に何もせず処理を終える
  // (design.md「エラーハンドリング」)
  return { notify: false, reason: 'unknown-workflow' }
}
