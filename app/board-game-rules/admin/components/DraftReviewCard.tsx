'use client'

import { useState } from 'react'
import type { GameRequest, GameRequestStatus, RequestMutationResult } from '../lib/gameRequests'
import { CHAPTER_KEYS, chapterHeading, type ChapterKey } from '../../lib/rulesChapters'

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

// 詳しい版ルールを共通章立て(CHAPTER_KEYS)の順に整列する。共通章立てにあるキーは本文が空でも
// 6章すべてを出し(運営者が「未生成の章」を把握できるように)、共通章立てにないキーは後ろに補う。
// 見出しは共通章立ての日本語見出し、対応が無ければキーをそのまま見出しにする(想定外のキーでも壊さない)
function orderDetailedChapters(
  rulesDetailed: { key: string; body: string }[]
): { key: string; heading: string; body: string }[] {
  const known = CHAPTER_KEYS.map((key) => ({
    key,
    heading: chapterHeading(key) ?? key,
    body: rulesDetailed.find((c) => c.key === key)?.body ?? '',
  }))
  const extra = rulesDetailed
    .filter((c) => !CHAPTER_KEYS.includes(c.key as ChapterKey))
    .map((c) => ({ key: c.key, heading: chapterHeading(c.key) ?? c.key, body: c.body }))
  return [...known, ...extra]
}

// 依頼1件の状況表示と、状態に応じた操作(登録実行・公開する・再調整を依頼)・再調整履歴
// (仕様: admin/design.md「登録実行・下書きレビューの処理」、admin/design.md「画面設計」の状態別操作)。
// 実際の写真解析・ルール生成はローカル環境で行われ、この画面はSupabase上の状態を更新するのみ
// (admin/requirements.md#登録実行のローカル処理起動-9)
export default function DraftReviewCard({ request, onTrigger, onPublish, onRequestRevision }: Props) {
  const { status } = request
  // 各操作の処理中はボタンを無効化し二重実行を防ぐ(design.md「エラーハンドリング」)
  const [busy, setBusy] = useState(false)
  // 公開時の文字数上限CHECK違反など、Web側の操作失敗を運営者に伝える(design.md「エラーハンドリング」)
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
  // 分類情報のうち値があるものだけをラベル付きで並べる。運営者が「公開する」前に生成物の質
  // (対象年齢・難易度・出版社・作者・日本語ルール有無・受賞歴・発売年)を判断できるようにする
  // (仕様: admin/requirements.md#登録実行・下書きレビュー-18)
  const classificationItems = draft
    ? [
        draft.minAge != null ? `対象年齢: ${draft.minAge}歳以上` : null,
        draft.difficulty ? `難易度: ${draft.difficulty}` : null,
        draft.publisher ? `出版社: ${draft.publisher}` : null,
        draft.author ? `作者: ${draft.author}` : null,
        draft.hasJapaneseRules != null
          ? `日本語ルール: ${draft.hasJapaneseRules ? 'あり' : 'なし'}`
          : null,
        draft.awards ? `受賞歴: ${draft.awards}` : null,
        draft.releaseYear != null ? `発売年: ${draft.releaseYear}年` : null,
      ].filter((v): v is string => v !== null)
    : []
  // 詳しい版ルールの全章(共通章立て順)。カードが縦に伸びすぎないよう<details>で折りたたむ
  const detailedChapters = draft ? orderDetailedChapters(draft.rulesDetailed) : []

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

      {status === 'draft' && request.draftContent && (
        <div className="mt-2 space-y-3">
          <div className="space-y-2 rounded border border-bgr-line bg-bgr-bg p-3 text-xs text-bgr-heading">
            <div>
              <p className="font-bold">{request.draftContent.name}</p>
              <p className="mt-1 text-bgr-subtext">
                {request.draftContent.minPlayers}〜{request.draftContent.maxPlayers}人 /{' '}
                {request.draftContent.minMinutes}〜{request.draftContent.maxMinutes}分 /{' '}
                {request.draftContent.genres.join('、') || 'ジャンルなし'}
              </p>
            </div>

            {classificationItems.length > 0 && (
              <ul className="space-y-0.5 text-bgr-subtext">
                {classificationItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}

            <div>
              <p className="font-bold text-bgr-subtext">簡単版ルール</p>
              <p className="mt-1 whitespace-pre-wrap text-bgr-subtext">
                {request.draftContent.rulesSimple}
              </p>
            </div>

            <details>
              <summary className="cursor-pointer font-bold text-bgr-subtext">
                詳しい版ルール(全{detailedChapters.length}章)
              </summary>
              <div className="mt-1 space-y-2">
                {detailedChapters.map((chapter) => (
                  <div key={chapter.key}>
                    <p className="font-bold text-bgr-subtext">{chapter.heading}</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-bgr-subtext">
                      {chapter.body.trim() === '' ? '(記載なし)' : chapter.body}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          </div>

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
