import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SongResultCard from '@/app/spotify-playlist/components/SongResultCard'
import type { TrackCandidate } from '@/app/spotify-playlist/lib/spotifyApi'

function candidate(id: string, title: string): TrackCandidate {
  return {
    id,
    uri: `spotify:track:${id}`,
    title,
    artist: 'アーティスト',
    album: 'アルバム',
    albumArtUrl: null,
    durationMs: 200_000,
  }
}

function renderCard(overrides: Partial<React.ComponentProps<typeof SongResultCard>> = {}) {
  const onSelect = vi.fn()
  const onLoadMore = vi.fn()
  const props: React.ComponentProps<typeof SongResultCard> = {
    songName: 'テスト曲',
    state: '未選択',
    candidates: [candidate('a', '候補A'), candidate('b', '候補B'), candidate('c', '候補C')],
    selectedId: null,
    hasMore: false,
    onSelect,
    onLoadMore,
    ...overrides,
  }
  render(<SongResultCard {...props} />)
  return { onSelect, onLoadMore }
}

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#候補の確定方法-2、specs/spotify-playlist/playlist-create/requirements.md#候補の確定方法-5
describe('曲名ごとの検索結果カード - 複数候補から採用する1件を選ぶ／選び直す', () => {
  it('複数候補のうち1件を押すと、その候補IDで採用確定が通知されること', () => {
    const { onSelect } = renderCard()
    fireEvent.click(screen.getByRole('button', { name: /候補B/ }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('すでに採用確定している曲でも、同じ一覧から別の候補を選び直すと新しい候補IDが通知されること', () => {
    const { onSelect } = renderCard({ state: '採用確定', selectedId: 'a' })
    expect(screen.getByRole('button', { name: /候補A/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /候補C/ }))
    expect(onSelect).toHaveBeenCalledWith('c')
  })

  it('未取得の候補が残っている場合だけ「もっと見る」を表示し、押すと追加取得が要求されること', () => {
    const { onLoadMore } = renderCard({ hasMore: true })
    fireEvent.click(screen.getByRole('button', { name: 'もっと見る' }))
    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('取得済み件数がSpotify側の全件数に達している(hasMore=false)ときは「もっと見る」を表示しないこと', () => {
    renderCard({ hasMore: false })
    expect(screen.queryByRole('button', { name: 'もっと見る' })).toBeNull()
  })

  it('検索結果が0件のときは中立トーンで「見つかりませんでした」を表示すること', () => {
    renderCard({ state: '見つからなかった', candidates: [] })
    expect(screen.getByText('見つかりませんでした')).toBeTruthy()
  })

  it('検索が失敗したときは未ヒットとは区別して「検索に失敗しました」を表示すること', () => {
    renderCard({ state: '検索失敗', candidates: [] })
    expect(screen.getByText('検索に失敗しました')).toBeTruthy()
  })
})
