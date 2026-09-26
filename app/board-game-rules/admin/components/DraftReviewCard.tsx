'use client'

import { useState } from 'react'
import type { GameRequest, GameRequestStatus, RequestMutationResult } from '../lib/gameRequests'
import { validateDraftForPublish, draftToPreviewGame } from '../lib/draftPreview'
import { RULE_CHAPTERS, CHAPTER_KEYS, type ChapterKey } from '../../lib/rulesChapters'
import GameInfo from '../../components/GameInfo'
import RuleTabs from '../../components/RuleTabs'

type Props = {
  request: GameRequest
  // T2b(admin/lib/gameRequests.ts)の各操作。呼び出し元(page.tsx)が成功後の一覧再取得まで担う
  onTrigger: (id: string, currentStatus: GameRequestStatus) => Promise<RequestMutationResult>
  onPublish: (request: GameRequest) => Promise<RequestMutationResult>
  onRequestRevision: (
    id: string,
    note: string,
    currentStatus: GameRequestStatus
  ) => Promise<RequestMutationResult>
}

// status(進行状態)ごとのバッジ表示。queued/running は運営者にとって区別の意味がないため「処理中」にまとめる
// (仕様: admin/design.md「登録実行・下書きレビューの処理」手順2、admin/requirements.md#登録実行・下書きレビュー-17)
const STATUS_LABEL: Record<GameRequestStatus, string> = {
  pending: '未着手',
  queued: '処理中',
  running: '処理中',
  draft: '下書きあり',
  published: '公開済み',
  failed: '失敗',
}

// 依頼1件の状況表示と、状態に応じた操作(登録実行・公開する・再調整を依頼)・再調整履歴
// (仕様: admin/design.md「登録実行・下書きレビューの処理」、admin/design.md「画面設計」の状態別操作)。
// 下書き(draft)は公開後の詳細画面(game-detail)と同じ表示コンポーネント(GameInfo・RuleTabs)を流用した
// 「公開後のプレビュー」として見せ、RuleTabs が隠す未生成の章・共通章立てにないキーは補助表示で運営者に示す。
// 実際の写真解析・ルール生成はローカル環境で行われ、この画面はSupabase上の状態を更新するのみ
// (admin/requirements.md#登録実行のローカル処理起動-9)
export default function DraftReviewCard({ request, onTrigger, onPublish, onRequestRevision }: Props) {
  const { status } = request
  // 各操作の処理中はボタンを無効化し二重実行を防ぐ(design.md「エラーハンドリング」)
  const [busy, setBusy] = useState(false)
  // 公開時の検証・INSERT失敗など、Web側の操作失敗を運営者に伝える(design.md「エラーハンドリング」)
  const [opError, setOpError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  async function run(action: () => Promise<RequestMutationResult>) {
    setBusy(true)
    setOpError(null)
    try {
      const result = await action()
      if (!result.ok) setOpError(result.error ?? '操作に失敗しました')
    } finally {
      setBusy(false)
    }
  }

  // 再調整履歴を新しい順(round降順)に並べる(仕様: admin/design.md「登録実行・下書きレビューの処理」手順6)
  const history = [...request.revisionHistory].sort((a, b) => b.round - a.round)

  const draft = request.draftContent
  // 公開後の詳細画面と同じ形へ変換したプレビュー用データ
  const previewGame = draft ? draftToPreviewGame(draft, request) : null
  // 「このまま公開すると失敗する」下書きの問題点(必須項目・ジャンル・文字数)。空なら警告を出さない
  const publishProblems = draft ? validateDraftForPublish(draft) : []

  // 共通章立て(RULE_CHAPTERS)のうち本文が空の章 = 公開後の詳しい版タブに出ない「未生成の章」
  const bodyByKey = new Map((draft?.rulesDetailed ?? []).map((c) => [c.key, c.body] as [string, string]))
  const ungeneratedChapters = RULE_CHAPTERS.filter(
    (chapter) => (bodyByKey.get(chapter.key) ?? '').trim() === ''
  ).map((chapter) => chapter.heading)
  // 共通章立てにないキー = 公開後は一切表示されない章。運営者が気づけるようキーを列挙する
  const unknownChapterKeys = (draft?.rulesDetailed ?? [])
    .map((c) => c.key)
    .filter((key) => !CHAPTER_KEYS.includes(key as ChapterKey))

  return (
    <div className="mt-3 border-t border-bgr-line pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-bgr-bg px-2 py-0.5 text-xs font-bold text-bgr-heading">
          {STATUS_LABEL[status]}
        </span>
      </div>

      {(status === 'pending' || status === 'failed') && (
        <div className="mt-2 space-y-2">
          {status === 'failed' && request.errorMessage && (
            <p className="text-xs text-bgr-accent">生成に失敗しました: {request.errorMessage}</p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => onTrigger(request.id, status))}
            className="rounded border border-bgr-line px-3 py-1 text-xs font-bold text-bgr-heading hover:bg-bgr-bg disabled:opacity-40"
          >
            登録実行
          </button>
        </div>
      )}

      {(status === 'queued' || status === 'running') && (
        <p className="mt-2 text-xs text-bgr-subtext">
          処理中です。ローカル環境での生成が終わるまでお待ちください。
        </p>
      )}

      {status === 'published' && (
        <p className="mt-2 text-xs text-bgr-subtext">このゲームは公開済みです。</p>
      )}

      {status === 'draft' && draft && previewGame && (
        <div className="mt-2 space-y-3">
          {publishProblems.length > 0 && (
            <div className="rounded border border-bgr-accent bg-bgr-bg p-3 text-xs text-bgr-accent">
              <p className="font-bold">このまま公開すると失敗します</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {publishProblems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded border border-bgr-line bg-bgr-bg p-3">
            <p className="text-xs font-bold text-bgr-subtext">
              公開後のプレビュー(訪問者にはこのように表示されます)
            </p>
            <div className="mt-2">
              <GameInfo game={previewGame} />
              <RuleTabs
                rulesSimple={previewGame.rulesSimple}
                rulesDetailed={previewGame.rulesDetailed}
              />
            </div>
          </div>

          {(ungeneratedChapters.length > 0 || unknownChapterKeys.length > 0) && (
            <div className="space-y-0.5 text-xs text-bgr-subtext">
              {ungeneratedChapters.length > 0 && (
                <p>未生成の章: {ungeneratedChapters.join(' / ')}</p>
              )}
              {unknownChapterKeys.length > 0 && (
                <p>公開時に表示されない章キー: {unknownChapterKeys.join(' / ')}</p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => onPublish(request))}
              className="rounded border border-bgr-line bg-bgr-heading px-3 py-1 text-xs font-bold text-bgr-card hover:opacity-90 disabled:opacity-40"
            >
              公開する
            </button>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-bgr-subtext" htmlFor={`revision-note-${request.id}`}>
              直してほしい点(再調整の要望)
            </label>
            <textarea
              id={`revision-note-${request.id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded border border-bgr-line bg-bgr-card p-2 text-xs text-bgr-heading"
            />
            <button
              type="button"
              disabled={busy || note.trim() === ''}
              onClick={() =>
                void run(async () => {
                  const result = await onRequestRevision(request.id, note.trim(), status)
                  if (result.ok) setNote('')
                  return result
                })
              }
              className="rounded border border-bgr-line px-3 py-1 text-xs font-bold text-bgr-heading hover:bg-bgr-bg disabled:opacity-40"
            >
              再調整を依頼
            </button>
          </div>

          {history.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-bgr-subtext">再調整の履歴</p>
              <ul className="space-y-1">
                {history.map((entry) => (
                  <li key={entry.round} className="text-xs text-bgr-subtext">
                    <span className="font-bold">{entry.round}回目:</span>{' '}
                    {entry.note ?? '(初回生成)'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {opError && <p className="mt-2 text-xs text-bgr-accent">{opError}</p>}
    </div>
  )
}
