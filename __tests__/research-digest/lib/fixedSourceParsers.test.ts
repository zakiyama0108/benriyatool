import { describe, it, expect } from 'vitest'
import { jmaPress, dietitianNews, aistResearch, naoNews, nedoNews, mextHoudou } from '../../../app/research-digest/lib/fixedSourceParsers'

// 仕様: specs/research-digest/content-selection/design.md「固定情報源のHTML構造への対応」(決定事項)
// 各サンプルHTMLは実際のサイト構造を/fixでcurl確認した結果を模したもの(2026-10-19確認)
describe('固定情報源のサイトごとの専用パーサー - HTML構造が情報源ごとに異なるため、それぞれ専用のパース関数を持つ', () => {
  it('jmaPress(日本医師会プレスリリース一覧)が見出し・URL・和暦混在の日付から新着を抽出できること', () => {
    const html = `<li>
      <span class="newsInner">
        <span class="date">令和8年（2026年）9月30日</span>
        <span class="ttl"><a href="/nichiionline/article/012919.html">令和８年熊本地震に対するＪＭＡＴ活動の終了について</a></span>
        <span class="date">松本吉郎会長、藤原慶正常任理事</span>
      </span>
    </li>`
    const items = jmaPress(html)
    expect(items).toEqual([
      { title: '令和８年熊本地震に対するＪＭＡＴ活動の終了について', url: 'https://www.med.or.jp/nichiionline/article/012919.html', publishedAt: '2026-09-30' },
    ])
  })

  it('dietitianNews(日本栄養士会お知らせ)がYYYY/MM/DD形式の日付から新着を抽出できること', () => {
    const html = `<div class="lyt-news_link--item is-medical">
      <p class="date">2026/10/16</p>
      <h2><a href="/news/2026/624.html" >【お知らせ】令和8年度診療報酬改定の疑問を解決！</a></h2>
    </div>`
    const items = dietitianNews(html)
    expect(items).toEqual([
      { title: '【お知らせ】令和8年度診療報酬改定の疑問を解決！', url: 'https://www.dietitian.or.jp/news/2026/624.html', publishedAt: '2026-10-16' },
    ])
  })

  it('aistResearch(産総研研究成果記事一覧)が見出し→日付の順(他サイトと逆順)でも新着を抽出できること', () => {
    const html = `<div class="reportList">
      <div class="reportListL">
        <p class="title"><a href="/aist_j/press_release/pr2026/pr20261019/pr20261019.html">細胞間接着分子がつながる瞬間を膜の上でとらえた</a></p>
      </div>
      <div class="reportListR">
        <p class="date">発表・掲載日：2026/10/19</p>
      </div>
    </div>`
    const items = aistResearch(html)
    expect(items).toEqual([
      { title: '細胞間接着分子がつながる瞬間を膜の上でとらえた', url: 'https://www.aist.go.jp/aist_j/press_release/pr2026/pr20261019/pr20261019.html', publishedAt: '2026-10-19' },
    ])
  })

  it('naoNews(国立天文台トピックス・研究成果)がdatetime属性から新着を抽出できること', () => {
    const html = `<article class="l-column2-3__item">
      <a href="/news/science/2026/20260930-sso.html" class="c-card c-card--hover">
        <ul class="c-page-data"><li class="u-mt0"><time datetime="2026-09-30">2026年9月30日</time></li></ul>
        <h2 class="c-heading4">気球観測Sunrise-IIIで太陽磁場の素顔に迫る</h2>
      </a>
    </article>`
    const items = naoNews(html)
    expect(items).toEqual([
      { title: '気球観測Sunrise-IIIで太陽磁場の素顔に迫る', url: 'https://www.nao.ac.jp/news/science/2026/20260930-sso.html', publishedAt: '2026-09-30' },
    ])
  })

  it('nedoNews(NEDOニュースリリース一覧)がdatetime属性から新着を抽出できること', () => {
    const html = `<ul class="news_list clm3">
      <li>
        <time datetime="2026-10-19">2026年10月19日</time>
        <a href="/news/press/AA5_101975.html">グリーンイノベーション基金事業で新たに研究テーマを採択しました</a>
      </li>
    </ul>`
    const items = nedoNews(html)
    expect(items).toEqual([
      { title: 'グリーンイノベーション基金事業で新たに研究テーマを採択しました', url: 'https://www.nedo.go.jp/news/press/AA5_101975.html', publishedAt: '2026-10-19' },
    ])
  })

  it('mextHoudou(文部科学省報道発表)が和暦の日付見出し1件につき直後の1件目の項目を抽出できること(同日複数件は先頭のみ)', () => {
    const html = `<h3 class="information-date">令和8年10月19日</h3>
    <ul class="news_list">
      <li><span class="area_doc"><a href="/b_menu/shingi/a.html">有識者会議（第5回）配布資料</a></span></li>
    </ul>
    <h3 class="information-date">令和8年10月15日</h3>
    <ul class="news_list">
      <li><span class="area_doc"><a href="/b_menu/shingi/b.html">検討会（第6回）の開催について</a></span></li>
      <li><span class="area_doc"><a href="/b_menu/shingi/c.html">2件目(対象外)</a></span></li>
    </ul>`
    const items = mextHoudou(html)
    expect(items).toEqual([
      { title: '有識者会議（第5回）配布資料', url: 'https://www.mext.go.jp/b_menu/shingi/a.html', publishedAt: '2026-10-19' },
      { title: '検討会（第6回）の開催について', url: 'https://www.mext.go.jp/b_menu/shingi/b.html', publishedAt: '2026-10-15' },
    ])
  })

  it('各パーサーは、対応する見出しブロックが見つからない場合は空配列を返すこと', () => {
    expect(jmaPress('<html></html>')).toEqual([])
    expect(dietitianNews('<html></html>')).toEqual([])
    expect(aistResearch('<html></html>')).toEqual([])
    expect(naoNews('<html></html>')).toEqual([])
    expect(nedoNews('<html></html>')).toEqual([])
    expect(mextHoudou('<html></html>')).toEqual([])
  })
})
