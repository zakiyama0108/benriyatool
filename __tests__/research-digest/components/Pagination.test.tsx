import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Pagination from '../../../app/research-digest/components/Pagination'

// 仕様: specs/research-digest/article-list/design.md「画面設計」
describe('ページ送り表示 - 前へ/次へと現在ページ/総ページ数を表示する', () => {
  it('総ページ数が1以下のとき、何も描画されないこと', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} />)
    expect(container.textContent).toBe('')
  })

  it('総ページ数が2以上のとき、前へ/次へと現在ページ/総ページ数が表示されること', () => {
    render(<Pagination currentPage={2} totalPages={3} />)
    expect(screen.getByText('2 / 3')).toBeTruthy()
    expect(screen.getByText('前へ')).toBeTruthy()
    expect(screen.getByText('次へ')).toBeTruthy()
  })

  it('1ページ目では「前へ」が表示されないこと', () => {
    render(<Pagination currentPage={1} totalPages={3} />)
    expect(screen.queryByText('前へ')).toBeNull()
    expect(screen.getByText('次へ')).toBeTruthy()
  })

  it('最終ページでは「次へ」が表示されないこと', () => {
    render(<Pagination currentPage={3} totalPages={3} />)
    expect(screen.getByText('前へ')).toBeTruthy()
    expect(screen.queryByText('次へ')).toBeNull()
  })
})
