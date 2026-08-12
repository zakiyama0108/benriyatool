import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ImportanceStars from '../../../app/ai-dev-digest/components/ImportanceStars'

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-12、specs/ai-dev-digest/article-detail/design.md#コンポーネント設計-ImportanceStars
describe('重要度表示 - importanceの値(1〜5)に応じて塗りつぶし★の数を変える', () => {
  it('importanceが1のとき、塗りつぶし★が1個・空☆が4個表示されること', () => {
    render(<ImportanceStars importance={1} />)
    expect(screen.getByText('★')).toBeTruthy()
    expect(screen.getAllByText('☆')).toHaveLength(4)
  })

  it('importanceが5のとき、塗りつぶし★が5個・空☆が0個表示されること', () => {
    render(<ImportanceStars importance={5} />)
    expect(screen.getAllByText('★')).toHaveLength(5)
    expect(screen.queryByText('☆')).toBeNull()
  })

  it('importanceが3のとき、塗りつぶし★が3個・空☆が2個表示されること', () => {
    render(<ImportanceStars importance={3} />)
    expect(screen.getAllByText('★')).toHaveLength(3)
    expect(screen.getAllByText('☆')).toHaveLength(2)
  })

  it('重要度の値がaria-labelで読み上げられること', () => {
    render(<ImportanceStars importance={4} />)
    expect(screen.getByLabelText('重要度4')).toBeTruthy()
  })
})
