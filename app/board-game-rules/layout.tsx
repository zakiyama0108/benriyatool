import type { Metadata } from 'next'

// 仕様: specs/hub-site/requirements.md#各ページのメタ情報(トップページ担当spec game-listが未実装のため暫定でhub-site側に定義。
// game-list実装時にそちらへ移設予定。specs/board-game-rules/game-list/requirements.md冒頭のメモ参照)
const TITLE = 'ボードゲームのルール確認｜人数・時間・ジャンルで探せる無料データベース'
const DESCRIPTION =
  'ボードゲームの説明書の写真からルールを自動生成して登録し、対応人数・プレイ時間・ジャンルなどで絞り込んで探せる無料のルール確認サービスです。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/board-game-rules',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function BoardGameRulesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
