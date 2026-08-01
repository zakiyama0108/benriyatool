import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Pagination from '../../../app/ai-dev-digest/components/Pagination'

// 仕様: specs/ai-dev-digest/article-list/design.md#画面設計
describe('ページネーション表示 - 前へ/次へと現在ページ/総ページ数を表示する(1ページのみの場合は非表示)', () => {
  it('総ページ数が1のとき、何も描画されないこと', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} />)
    expect(container.firstChild).toBeNull()
  })

  it('総ページ数が0のとき、何も描画されないこと', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('総ページ数が2以上のとき、前へ/次へのリンクと現在ページ/総ページ数が表示されること', () => {
    render(<Pagination currentPage={1} totalPages={3} />)
    expect(screen.getByText('1 / 3')).toBeTruthy()
    expect(screen.getByRole('link', { name: '次へ' })).toBeTruthy()
  })

  it('1ページ目のとき、「前へ」のリンクは表示されないこと', () => {
    render(<Pagination currentPage={1} totalPages={3} />)
    expect(screen.queryByRole('link', { name: '前へ' })).toBeNull()
  })

  it('最終ページのとき、「次へ」のリンクは表示されないこと', () => {
    render(<Pagination currentPage={3} totalPages={3} />)
    expect(screen.queryByRole('link', { name: '次へ' })).toBeNull()
    expect(screen.getByRole('link', { name: '前へ' })).toBeTruthy()
  })

  it('2ページ目の「前へ」は1ページ目(一覧トップ)へのリンクになること', () => {
    render(<Pagination currentPage={2} totalPages={3} />)
    const prev = screen.getByRole('link', { name: '前へ' })
    expect(prev.getAttribute('href')).toBe('/ai-dev-digest')
  })

  it('2ページ目の「次へ」は3ページ目へのリンクになること', () => {
    render(<Pagination currentPage={2} totalPages={3} />)
    const next = screen.getByRole('link', { name: '次へ' })
    expect(next.getAttribute('href')).toBe('/ai-dev-digest/page/3')
  })
})
