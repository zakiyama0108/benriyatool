import { describe, it, expect } from 'vitest'
import { metadata } from '@/app/spotify-playlist/layout'

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#メタ情報-1
describe('曲名からプレイリスト作成ページのメタ情報 - 検索結果向けのtitle・descriptionを定義する', () => {
  it('titleは「曲名からプレイリスト作成｜Spotifyに一括登録できる無料ツール」であること', () => {
    expect(metadata.title).toBe('曲名からプレイリスト作成｜Spotifyに一括登録できる無料ツール')
  })

  it('descriptionは曲名の一括入力でSpotifyにプレイリストを自動作成できる旨を伝えること', () => {
    expect(metadata.description).toContain('曲名をまとめて入力するだけで')
    expect(metadata.description).toContain('Spotifyアカウントに新しいプレイリストを自動作成')
  })
})
