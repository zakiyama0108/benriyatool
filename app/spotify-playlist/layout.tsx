import type { Metadata } from 'next'

// 仕様: specs/hub-site/requirements.md#機能要件-3(spotify-playlistの暫定定義。オーナーspec実装にあわせて本ファイルへ移設)
const TITLE = '曲名からプレイリスト作成｜Spotifyに一括登録できる無料ツール'
const DESCRIPTION =
  '聴きたい曲の曲名をまとめて入力するだけで、自分のSpotifyアカウントに新しいプレイリストを自動作成。1曲ずつSpotifyアプリ内で検索して追加する手間がかかりません。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/spotify-playlist',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function SpotifyPlaylistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
