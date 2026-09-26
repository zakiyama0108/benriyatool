import { mapWithConcurrency } from './mapWithConcurrency'
import { searchTracks, type TrackCandidate } from './spotifyApi'
import { SpotifyAuthError } from './spotifyAuth'

// 曲名の一括検索を、同時実行数を絞った小さなバッチで走らせる(design.md#パフォーマンス、design.md#曲名を一括検索する処理 手順3)。
export const SEARCH_CONCURRENCY = 5

// 1曲名分の検索結果。個々の曲の通信エラーは他の曲をブロックせず、その曲だけ'searchFailed'にする
// (design.md#エラーハンドリング、design.md#曲名を一括検索する処理 手順7)。
export type SongSearchResult =
  | { kind: 'notFound' }
  | { kind: 'searchFailed' }
  | { kind: 'auto'; candidate: TrackCandidate }
  | { kind: 'multiple'; candidates: TrackCandidate[]; total: number }

// namesの各曲を検索し、完了した曲から順にonResultで通知する(結果が返る順に画面へ反映できるようにする)。
// searchはテスト差し込み用(既定はspotifyApiのsearchTracks)。
export async function searchSongs(
  names: string[],
  onResult: (index: number, result: SongSearchResult) => void,
  deps: { search?: typeof searchTracks } = {}
): Promise<void> {
  const search = deps.search ?? searchTracks
  await mapWithConcurrency(names, SEARCH_CONCURRENCY, async (name, index) => {
    try {
      onResult(index, await search(name))
    } catch (error) {
      // セッション失効(トークン再発行の失敗)は一括検索全体を中断させる(design.md#アクセストークンを自動更新する処理)。
      // 個々の曲の通信エラーはその曲だけ失敗表示にして他の曲は続行する。
      if (error instanceof SpotifyAuthError) throw error
      onResult(index, { kind: 'searchFailed' })
    }
  })
}
