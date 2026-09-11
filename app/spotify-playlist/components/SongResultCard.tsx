'use client'

import type { TrackCandidate } from '../lib/spotifyApi'

// 曲1件あたりの状態(design.md#状態管理 状態遷移図、design.md#コンポーネント設計)。
export type SongCardState = '検索中' | '見つからなかった' | '検索失敗' | '未選択' | '採用確定'

type Props = {
  songName: string
  state: SongCardState
  candidates: TrackCandidate[]
  // 採用候補として選ばれているトラックID(未選択・未ヒット時はnull)
  selectedId: string | null
  // Spotify側にまだ取得していない候補が残っているか(「もっと見る」の表示可否)
  hasMore: boolean
  loadingMore?: boolean
  // 作成完了後の閲覧のみモード(候補選択・もっと見るを不可にする、design.md#画面設計「作成完了」)
  readOnly?: boolean
  onSelect: (id: string) => void
  onLoadMore: () => void
}

// 分:秒 形式(例: 3:24)。Spotifyの再生時間表示に合わせる。
function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

function CandidateRow({
  candidate,
  selected,
  readOnly,
  onSelect,
}: {
  candidate: TrackCandidate
  selected: boolean
  readOnly: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={readOnly}
      onClick={() => onSelect(candidate.id)}
      className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
        selected ? 'border-sp-green bg-sp-surface-hover' : 'border-sp-line hover:bg-sp-surface-hover'
      } disabled:cursor-default disabled:hover:bg-transparent`}
    >
      {candidate.albumArtUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Spotify CDNの画像をそのまま表示する(next/image最適化は不要)
        <img src={candidate.albumArtUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <span aria-hidden="true" className="h-10 w-10 shrink-0 rounded bg-sp-surface-hover" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-sp-text">{candidate.title}</span>
        <span className="block truncate text-xs text-sp-subtext">
          {candidate.artist}・{candidate.album}
        </span>
      </span>
      <span className="shrink-0 text-xs tabular-nums text-sp-subtext">{formatDuration(candidate.durationMs)}</span>
    </button>
  )
}

// 曲名ごとの検索結果カード。状態に応じてスケルトン・未ヒット・検索失敗・候補一覧(単一/複数)を
// 出し分け、候補選択・「もっと見る」を扱う(design.md#曲名を一括検索する処理、design.md#候補を選択する処理)。
export default function SongResultCard({
  songName,
  state,
  candidates,
  selectedId,
  hasMore,
  loadingMore = false,
  readOnly = false,
  onSelect,
  onLoadMore,
}: Props) {
  return (
    <section className="rounded-2xl border border-sp-line bg-sp-surface p-4">
      <h3 className="mb-3 truncate text-sm font-bold text-sp-text">{songName}</h3>

      {state === '検索中' && (
        <div className="space-y-2" aria-label="検索中" role="status">
          <div className="h-12 animate-pulse rounded-lg bg-sp-surface-hover" />
          <div className="h-12 animate-pulse rounded-lg bg-sp-surface-hover" />
        </div>
      )}

      {state === '見つからなかった' && <p className="text-sm text-sp-subtext">見つかりませんでした</p>}

      {state === '検索失敗' && <p className="text-sm text-sp-subtext">検索に失敗しました</p>}

      {(state === '未選択' || state === '採用確定') && (
        <div className="space-y-2">
          {state === '採用確定' && candidates.length === 1 && (
            <p className="text-xs font-medium text-sp-green">この曲を採用しました</p>
          )}
          <div className="space-y-1.5">
            {candidates.map((candidate) => (
              <CandidateRow
                key={candidate.id}
                candidate={candidate}
                selected={candidate.id === selectedId}
                readOnly={readOnly}
                onSelect={onSelect}
              />
            ))}
          </div>
          {hasMore && !readOnly && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="text-xs font-bold text-sp-subtext hover:text-sp-text disabled:opacity-60"
            >
              {loadingMore ? '読み込み中…' : 'もっと見る'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
