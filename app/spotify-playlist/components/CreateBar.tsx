'use client'

type Props = {
  // 採用候補が確定している曲数(design.md#プレイリストを作成する処理 手順2)
  adoptedCount: number
  playlistName: string
  onPlaylistNameChange: (name: string) => void
  // 採用候補0件 or プレイリスト名未入力で作成不可(design.md#プレイリストを作成する処理 手順1)
  disabled: boolean
  isCreating: boolean
  onCreate: () => void
  // 作成失敗時に表示する日本語の定型メッセージ(design.md#エラーハンドリング)
  errorMessage?: string | null
  // 作成完了時に渡す。渡された場合は完了表示(リンク+「もう一度作る」)へ切り替える(design.md#画面設計「作成完了」)
  completedUrl?: string | null
  onReset: () => void
}

// 画面下部固定バー。採用曲数・プレイリスト名入力・「プレイリストを作成」ボタン。
// 作成完了後は完了表示・「もう一度作る」ボタンに切り替える(design.md#コンポーネント設計)。
export default function CreateBar({
  adoptedCount,
  playlistName,
  onPlaylistNameChange,
  disabled,
  isCreating,
  onCreate,
  errorMessage,
  completedUrl,
  onReset,
}: Props) {
  return (
    <div className="sticky bottom-0 border-t border-sp-line bg-sp-surface px-4 py-3">
      <div className="mx-auto max-w-2xl">
        {completedUrl ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href={completedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-bold text-sp-green hover:text-sp-green-hover hover:underline"
            >
              作成したプレイリストを開く
            </a>
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-sp-line px-4 py-1.5 text-sm font-bold text-sp-text hover:bg-sp-surface-hover"
            >
              もう一度作る
            </button>
          </div>
        ) : (
          <>
            {errorMessage && (
              <p role="alert" className="mb-2 text-xs text-sp-subtext">
                {errorMessage}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-sp-subtext">採用: {adoptedCount}曲</span>
              <input
                type="text"
                value={playlistName}
                onChange={(event) => onPlaylistNameChange(event.target.value)}
                placeholder="プレイリスト名"
                aria-label="プレイリスト名"
                className="min-w-0 flex-1 rounded-full border border-sp-line bg-sp-bg px-4 py-1.5 text-sm text-sp-text placeholder:text-sp-subtext"
              />
              <button
                type="button"
                onClick={onCreate}
                disabled={disabled || isCreating}
                className="rounded-full bg-sp-green px-5 py-1.5 text-sm font-bold text-sp-on-green hover:bg-sp-green-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? '作成中…' : 'プレイリストを作成'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
