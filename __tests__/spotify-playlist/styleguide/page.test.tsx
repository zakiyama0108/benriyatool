import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StyleguidePage from '@/app/spotify-playlist/styleguide/page'

// spotify-playlist の styleguide は開発者向けの確認ページ(利用者向け仕様ではないため spec との対応付けは持たない)。
// design/SKILL.md「共通chromeとトークンの一貫性」に沿って、実装済みのトークンと共通部品を1ページに写す。
describe('【styleguide】spotify-playlist の配色トークンと共通部品のカタログ', () => {
  it('sp-* の配色トークンのスウォッチ(トークン名と16進値)が並ぶこと', () => {
    render(<StyleguidePage />)
    for (const token of ['sp-bg', 'sp-surface', 'sp-line', 'sp-green', 'sp-subtext']) {
      expect(screen.getByText(token)).toBeTruthy()
    }
    expect(screen.getByText('#121212')).toBeTruthy()
    expect(screen.getByText('#1db954')).toBeTruthy()
  })

  it('SongResultCard の各状態(未ヒット・検索失敗・候補一覧)と CreateBar の見本が並ぶこと', () => {
    render(<StyleguidePage />)
    expect(screen.getByText('見つかりませんでした')).toBeTruthy()
    expect(screen.getByText('検索に失敗しました')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'プレイリストを作成' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /作成したプレイリスト/ })).toBeTruthy()
  })

  it('キャプチャのwait-target用に見出しへ「styleguide」を含むこと', () => {
    render(<StyleguidePage />)
    expect(screen.getByText(/styleguide/i)).toBeTruthy()
  })
})
