import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArticleJsonLd from '../../../../app/ikukyu/guide/components/ArticleJsonLd'
import FaqSection from '../../../../app/ikukyu/guide/components/FaqSection'

const faqs = [
  { question: 'パパが14日だけ取った場合も対象になりますか?', answer: 'はい。夫婦それぞれが14日以上取得していれば対象になります。' },
]

// 仕様: specs/ikukyu/guide/requirements.md#記事ページ共通-5
describe('ガイド記事の構造化データ - Article(とFAQがある場合はFAQPage)のJSON-LDを検索エンジン向けに出力する', () => {
  it('Article構造化データに記事タイトル・URL・更新日が含まれること', () => {
    const { container } = render(
      <ArticleJsonLd
        title="【2026年版】育休の手取り10割は本当?"
        description="テスト用の説明文"
        path="/ikukyu/guide/tedori-10wari/"
        dateModified="2026-07-18"
      />
    )
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts).toHaveLength(1)
    const json = JSON.parse(scripts[0].innerHTML)
    expect(json['@type']).toBe('Article')
    expect(json.headline).toContain('手取り10割')
    expect(json.url).toBe('https://benriyatool.com/ikukyu/guide/tedori-10wari/')
    expect(json.dateModified).toBe('2026-07-18')
  })

  it('FAQを渡した場合、FAQPage構造化データも出力され、質問と回答が含まれること', () => {
    const { container } = render(
      <ArticleJsonLd title="t" description="d" path="/ikukyu/guide/tedori-10wari/" dateModified="2026-07-18" faqs={faqs} />
    )
    const scripts = container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts).toHaveLength(2)
    const faqJson = JSON.parse(scripts[1].innerHTML)
    expect(faqJson['@type']).toBe('FAQPage')
    expect(faqJson.mainEntity[0].name).toContain('14日')
  })

  it('タイトルにscriptタグの断片が含まれても、「<」がエスケープされてタグの早期終了(XSS)が起きないこと', () => {
    const { container } = render(
      <ArticleJsonLd title="</script><script>alert(1)" description="d" path="/x/" dateModified="2026-07-18" />
    )
    const html = container.querySelector('script[type="application/ld+json"]')!.innerHTML
    expect(html).not.toContain('</script>')
    expect(html).toContain('\\u003c')
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事ページ共通-5
describe('ガイド記事のFAQ表示 - 画面のQ&AとFAQPage構造化データが同じデータ源から作られる', () => {
  it('FaqSectionに渡した質問・回答が開閉式のQ&Aとして表示されること', () => {
    render(<FaqSection faqs={faqs} theme="mint" />)
    expect(screen.getByText('パパが14日だけ取った場合も対象になりますか?')).toBeTruthy()
    expect(screen.getByText(/夫婦それぞれが14日以上/)).toBeTruthy()
  })
})
