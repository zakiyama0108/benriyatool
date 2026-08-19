import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import LegalPage from '../../app/legal/page'

// 仕様: specs/board-game-rules/game-registration/requirements.md#利用規約への反映-8
describe('【利用規約】知的財産の条項 - ボードゲームのルール解説が原文転載ではない旨を明記する', () => {
  it('運営者が独自の言い回しで再構成したルール解説を掲載している旨と、著作権者からの修正・削除要望に速やかに対応する旨が表示されること', () => {
    render(<LegalPage />)

    expect(
      screen.getByText(
        /本サービスの一部機能\(ボードゲームのルール確認\)では、利用者から寄せられた依頼をもとに、運営者が独自の言い回しで再構成したルール解説を掲載している.*著作権者から掲載内容の修正・削除の要望があれば、問い合わせ先まで連絡があり次第、速やかに対応する/
      )
    ).toBeTruthy()
  })

  it('ゲーム紹介画像が実物撮影またはAI加工に限られ、第三者画像の転載ではない旨が表示されること', () => {
    render(<LegalPage />)

    expect(
      screen.getByText(
        /ゲームを紹介する画像は、投稿者または運営者が実物を撮影したもの、もしくはそれを基にAIで加工したものを掲載しており、第三者の画像をそのまま転載するものではない/
      )
    ).toBeTruthy()
  })
})
