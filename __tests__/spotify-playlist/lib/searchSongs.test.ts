import { describe, it, expect, vi } from 'vitest'
import { searchSongs, SEARCH_CONCURRENCY, type SongSearchResult } from '@/app/spotify-playlist/lib/searchSongs'
import { SpotifyApiError } from '@/app/spotify-playlist/lib/spotifyApi'
import { SpotifyAuthError } from '@/app/spotify-playlist/lib/spotifyAuth'
import type { TrackCandidate } from '@/app/spotify-playlist/lib/spotifyApi'

function candidate(id: string): TrackCandidate {
  return { id, uri: `spotify:track:${id}`, title: id, artist: 'a', album: 'b', albumArtUrl: null, durationMs: 1000 }
}

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-3
describe('曲名の一括検索 - 同時実行数を絞りつつ、1曲の失敗で全体を止めない', () => {
  it('検索は同時実行数を絞ったバッチで呼ばれること(全曲同時には走らない)', async () => {
    const names = Array.from({ length: 20 }, (_, i) => `曲${i}`)
    let inFlight = 0
    let maxInFlight = 0
    const search = vi.fn(async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((r) => setTimeout(r, 3))
      inFlight--
      return { kind: 'notFound' } as const
    })

    await searchSongs(names, () => {}, { search })
    expect(search).toHaveBeenCalledTimes(20)
    expect(maxInFlight).toBeLessThanOrEqual(SEARCH_CONCURRENCY)
  })

  it('各曲の結果(未ヒット/自動採用/候補一覧)がインデックス付きで通知されること', async () => {
    const search = vi.fn((name: string) => {
      if (name === '無い曲') return Promise.resolve({ kind: 'notFound' } as const)
      if (name === '一意な曲') return Promise.resolve({ kind: 'auto', candidate: candidate('x') } as const)
      return Promise.resolve({ kind: 'multiple', candidates: [candidate('a'), candidate('b')], total: 9 } as const)
    })
    const results: Record<number, SongSearchResult> = {}
    await searchSongs(['無い曲', '一意な曲', '人気曲'], (i, r) => (results[i] = r), { search })

    expect(results[0]).toEqual({ kind: 'notFound' })
    expect(results[1]).toEqual({ kind: 'auto', candidate: candidate('x') })
    expect(results[2]).toMatchObject({ kind: 'multiple', total: 9 })
  })

  it('一部の曲が通信エラーで失敗しても、その曲だけ「検索失敗」にして他の曲の結果は返ること', async () => {
    const search = vi.fn((name: string) => {
      if (name === '曲1') return Promise.reject(new SpotifyApiError('通信エラー'))
      return Promise.resolve({ kind: 'notFound' } as const)
    })
    const results: Record<number, SongSearchResult> = {}
    await searchSongs(['曲0', '曲1', '曲2'], (i, r) => (results[i] = r), { search })

    expect(results[0]).toEqual({ kind: 'notFound' })
    expect(results[1]).toEqual({ kind: 'searchFailed' })
    expect(results[2]).toEqual({ kind: 'notFound' })
  })

  it('セッション失効(トークン再発行の失敗)の場合は一括検索全体を中断する(エラーを伝播する)', async () => {
    const search = vi.fn(() => Promise.reject(new SpotifyAuthError('ログイン情報がありません')))
    await expect(searchSongs(['曲0', '曲1'], () => {}, { search })).rejects.toBeInstanceOf(SpotifyAuthError)
  })
})
