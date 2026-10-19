import { describe, it, expect } from 'vitest'
import { amedNews, ipccHome, envPress, worksINews, ncggTopics, iissLatest, cfrLatest } from '../../../app/future-digest/lib/fixedSourceParsers'

// 仕様: specs/future-digest/content-selection/design.md「固定情報源からヒントを集める処理」
// 各parserIdは実際の公開ページ(2026-10-19にcurlで取得確認済み)のHTML構造を縮小した断片で検証する
describe('固定情報源の専用パーサー - site-specific-html形式の7情報源から見出し・URL・日付を抽出する', () => {
  it('amedNews: <li><div class="head">...<span class="date">日付</span></div><a>見出し</a></li>から抽出できること', () => {
    const html = `<ul class="listTimeline-">
      <li><div class="head"><span class="label- _color-05">トピックス</span><span class="date">令和8年10月19日</span></div><a href="/news/topics/20261019.html">見出しA</a></li>
      <li><div class="head"><span class="date">令和8年10月16日</span></div><a href="/news/topics/20261020.html">見出しB</a></li>
    </ul>`
    const hints = amedNews(html, 'https://www.amed.go.jp/news/index.html')
    expect(hints).toEqual([
      { title: '見出しA', url: 'https://www.amed.go.jp/news/topics/20261019.html', publishedAt: '令和8年10月19日' },
      { title: '見出しB', url: 'https://www.amed.go.jp/news/topics/20261020.html', publishedAt: '令和8年10月16日' },
    ])
  })

  it('ipccHome: <h4><a>見出し</a></h4>...<h6>日付</h6>から抽出できること', () => {
    const html = `<div class="post-preview"><h4><a href="https://www.ipcc.ch/event/a/">見出しA</a></h4><h6>October 12, 2026</h6></div>`
    const hints = ipccHome(html, 'https://www.ipcc.ch/')
    expect(hints).toEqual([{ title: '見出しA', url: 'https://www.ipcc.ch/event/a/', publishedAt: 'October 12, 2026' }])
  })

  it('envPress: <summary>...日付のspan</summary><div class="...body">...<a class="c-news-link__link">見出し</a></div>から、同じ日付ブロック内の複数見出しを抽出できること', () => {
    const html = `<details><summary><span class="p-press-release-list__heading">2026年10月19日発表</span></summary>
      <div class="p-press-release-list__body"><ul>
        <li><a href="/press/press_1.html" class="c-news-link__link">見出しA</a></li>
        <li><a href="/press/press_2.html" class="c-news-link__link">見出しB</a></li>
      </ul></div>
      <div class="p-press-release-list__anchor-back"></div></details>`
    const hints = envPress(html, 'https://www.env.go.jp/press/index.html')
    expect(hints).toEqual([
      { title: '見出しA', url: 'https://www.env.go.jp/press/press_1.html', publishedAt: '2026年10月19日発表' },
      { title: '見出しB', url: 'https://www.env.go.jp/press/press_2.html', publishedAt: '2026年10月19日発表' },
    ])
  })

  it('worksINews: <a><p class="itemNews__date">日付</p><p class="itemNews__text">見出し</p></a>から抽出できること', () => {
    const html = `<li class="itemNews"><a href="/news/202610.html"><p class="itemNews__date">2026年10月13日</p><p class="itemNews__text">見出しA</p></a></li>`
    const hints = worksINews(html, 'https://www.works-i.com/news/index.html')
    expect(hints).toEqual([{ title: '見出しA', url: 'https://www.works-i.com/news/202610.html', publishedAt: '2026年10月13日' }])
  })

  it('ncggTopics: <td class="dateCell">日付</td><td><a>見出し</a>から抽出できること', () => {
    const html = `<tr><th></th><td class="dateCell">2026年10月19日</td><td><a href="../ri/report/a.html">見出しA</a></td></tr>`
    const hints = ncggTopics(html, 'https://www.ncgg.go.jp/topics/')
    expect(hints).toEqual([{ title: '見出しA', url: 'https://www.ncgg.go.jp/ri/report/a.html', publishedAt: '2026年10月19日' }])
  })

  it('iissLatest: 埋め込みJSON("Heading"/"Date"/"Link")から抽出できること', () => {
    const html = `window.__props = {"Heading":"見出しA","Intro":"説明","Date":"25th September 2026","Link":"/online-analysis/a/","OpenInNewTab":false}`
    const hints = iissLatest(html, 'https://www.iiss.org/latest/')
    expect(hints).toEqual([{ title: '見出しA', url: 'https://www.iiss.org/online-analysis/a/', publishedAt: '25th September 2026' }])
  })

  it('cfrLatest: <h3><a href="/articles/...">見出し</a></h3>...<time dateTime="...">表示日付</time>から抽出できること', () => {
    const html = `<article><h3><a href="/articles/a">見出しA</a></h3><time dateTime="2026-10-18T16:45:18.000Z">October 18, 2026</time></article>`
    const hints = cfrLatest(html, 'https://www.cfr.org/latest')
    expect(hints).toEqual([{ title: '見出しA', url: 'https://www.cfr.org/articles/a', publishedAt: 'October 18, 2026' }])
  })

  it('amedNews: 見出し・日付の片方が見つからない項目は結果から除かれること', () => {
    const html = `<li><div class="head"></div></li>`
    expect(amedNews(html, 'https://www.amed.go.jp/news/index.html')).toEqual([])
  })
})
