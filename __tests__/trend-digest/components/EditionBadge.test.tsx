import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import EditionBadge from '../../../app/trend-digest/components/EditionBadge'

// 仕様: specs/trend-digest/article-list/requirements.md#一覧表示-2
describe('グループバッジ表示 - エンタメ編/カルチャー編を一覧のカード上でひと目で見分けられるようにする', () => {
  it('edition が entertainment のとき、「エンタメ」と表示されること', () => {
    render(<EditionBadge edition="entertainment" />)
    expect(screen.getByText('エンタメ')).toBeTruthy()
  })

  it('edition が culture-lifestyle のとき、「カルチャー」と表示されること', () => {
    render(<EditionBadge edition="culture-lifestyle" />)
    expect(screen.getByText('カルチャー')).toBeTruthy()
  })
})
