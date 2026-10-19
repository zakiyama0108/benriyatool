import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FormattedText from '../../../app/ai-dev-digest/components/FormattedText'

// 活用法の手順が読みやすい段落・リスト・コードブロックとして描画されること、コピペ用のコードブロックが<pre><code>として表示されることを検証する
// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-15、specs/ai-dev-digest/article-detail/design.md#コンポーネント設計-FormattedText
describe('観点の詳細文の整形表示(FormattedText)', () => {
  it('段落のみのテキストは<p>として描画されること', () => {
    render(<FormattedText text="ただの説明文です" />)
    expect(screen.getByText('ただの説明文です').tagName).toBe('P')
  })

  it('番号付きリストは<ol><li>として描画されること', () => {
    render(<FormattedText text={'1. 最初の手順\n2. 次の手順'} />)
    const list = screen.getByText('最初の手順').closest('ol')
    expect(list).not.toBeNull()
    expect(screen.getByText('次の手順').tagName).toBe('LI')
  })

  it('コードブロックは<pre><code>として描画され、コピー操作のボタンが表示されること', () => {
    render(<FormattedText text={'```\nnpm install\n```'} />)
    expect(screen.getByText('npm install').tagName).toBe('CODE')
    expect(screen.getByText('npm install').closest('pre')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'コピー' })).toBeTruthy()
  })

  it('[text](url)記法はリンクとして描画されること', () => {
    render(<FormattedText text="詳しくは[公式ドキュメント](https://example.com/docs)へ" />)
    const link = screen.getByRole('link', { name: '公式ドキュメント' })
    expect(link.getAttribute('href')).toBe('https://example.com/docs')
  })

  it('番号付きリストがコードブロックで中断された場合、再開後の<ol>が元の番号から続くこと(1.に戻らない)', () => {
    render(<FormattedText text={'1. 最初の手順\n2. 次の手順\n```\nnpm install\n```\n3. 最後の手順'} />)
    const resumedList = screen.getByText('最後の手順').closest('ol')
    expect(resumedList?.getAttribute('start')).toBe('3')
  })
})
