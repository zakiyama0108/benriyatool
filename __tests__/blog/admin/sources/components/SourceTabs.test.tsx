import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SourceTabs from '../../../../../app/blog/admin/sources/components/SourceTabs'
import { DIGEST_APPS } from '../../../../../app/blog/lib/digestApps'

// 仕様: specs/blog/source-directory/requirements.md#アプリ切り替えタブ-1、specs/blog/source-directory/requirements.md#アプリ切り替えタブ-2
describe('SourceTabs - DIGEST_APPSの順でタブを表示し、クリックで選択アプリの切り替えを通知する', () => {
  it('DIGEST_APPSの順(ai-dev-digest→news-digest→trend-digest→future-digest→research-digest)でタブが表示されること', () => {
    render(<SourceTabs apps={DIGEST_APPS} selectedId="ai-dev-digest" onSelect={() => {}} />)
    const tabs = screen.getAllByRole('tab')
    // DOM上の並び順もDIGEST_APPSの記載順であること
    expect(tabs).toHaveLength(5)
    for (let i = 0; i < DIGEST_APPS.length; i++) {
      expect(tabs[i].textContent).toContain(DIGEST_APPS[i].name)
    }
  })

  it('タブをクリックするとそのアプリのidでonSelectが呼ばれること', () => {
    const onSelect = vi.fn()
    render(<SourceTabs apps={DIGEST_APPS} selectedId="ai-dev-digest" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('tab', { name: /週刊トレンド/ }))
    expect(onSelect).toHaveBeenCalledWith('trend-digest')
  })

  it('selectedIdに一致するタブがaria-selected=trueになること', () => {
    render(<SourceTabs apps={DIGEST_APPS} selectedId="news-digest" onSelect={() => {}} />)
    expect(screen.getByRole('tab', { name: /重要ニュースダイジェスト/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: /AI駆動開発ダイジェスト/ }).getAttribute('aria-selected')).toBe('false')
  })
})
