import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import WebSiteJsonLd from '../../app/components/WebSiteJsonLd'

// 仕様: specs/hub-site/requirements.md#機能要件-1
describe('【トップページ】WebSite構造化データ - Google検索結果にサイト名「べんりやつーる」を提示する', () => {
  it('WebSiteスキーマのJSON-LDスクリプトに、サイト名「べんりやつーる」と本番URLが含まれること', () => {
    const { container } = render(<WebSiteJsonLd />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()

    // Googleがサイト名として読み取るのに必要な最小構成(@context・@type・name・url)を検証する
    const jsonLd: unknown = JSON.parse(script!.textContent ?? '')
    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'べんりやつーる',
      url: 'https://benriyatool.com',
    })
  })
})
