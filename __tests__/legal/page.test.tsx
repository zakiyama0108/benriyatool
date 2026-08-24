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

// 仕様: specs/board-game-rules/comment/requirements.md#データ保護-4
describe('【プライバシーポリシー】コメントの公開保存 - 氏名を含みうる表示名と本文を公開保存する旨を明記する', () => {
  it('コメントの表示名(氏名を含む場合がある)と本文を、対象ゲームのページに保存する旨が表示されること', () => {
    render(<LegalPage />)

    expect(
      screen.getByText(
        /利用者が投稿したコメントは、表示名.*氏名を含む場合があります.*と本文を、対象ゲームのページに.*して保存します/
      )
    ).toBeTruthy()
  })

  it('コメントの表示名・本文は誰でも閲覧できるため公開したくない情報を含めないよう注意喚起されていること', () => {
    render(<LegalPage />)

    expect(
      screen.getByText(/コメントの表示名・本文は、ログインの有無にかかわらず誰でも閲覧できるため、公開したくない情報を含めないよう/)
    ).toBeTruthy()
  })
})
