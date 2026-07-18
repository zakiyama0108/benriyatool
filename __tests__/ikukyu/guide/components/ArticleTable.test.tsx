import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArticleTable from '../../../../app/ikukyu/guide/components/ArticleTable'

// 仕様: specs/ikukyu/guide/requirements.md#記事ページ共通-3、specs/ikukyu/guide/requirements.md#月額給付額の定義-2
describe('ガイド記事の数値表 - 給付額の一覧をHTMLテーブルで描画する(画像化しない)', () => {
  const columns = [
    { header: '月給(額面)' },
    { header: '通常の給付(67%)', align: 'right' as const },
    { header: '上乗せ後(80%)', align: 'right' as const },
  ]
  const rows = [
    { cells: ['30万円', '201,000円', '240,000円'] },
    { cells: ['50万円', '323,790円', '386,610円'], capped: true },
  ]

  it('列見出しと各行のセルが、HTMLのtable要素として描画されること', () => {
    render(<ArticleTable columns={columns} rows={rows} theme="mint" />)
    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.getByText('通常の給付(67%)')).toBeTruthy()
    expect(screen.getByText('201,000円')).toBeTruthy()
    expect(screen.getByText('386,610円')).toBeTruthy()
  })

  it('賃金日額の上限を超えた行には「上限適用」バッジが表示され、超えていない行には表示されないこと', () => {
    render(<ArticleTable columns={columns} rows={rows} theme="mint" />)
    expect(screen.getAllByText('上限適用')).toHaveLength(1)
  })
})
