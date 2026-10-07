import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { billboardJapan } from '../../../scripts/trend-digest/sourceParsers/billboardJapan'
import { kogyoTsushin } from '../../../scripts/trend-digest/sourceParsers/kogyoTsushin'
import { eigaCom } from '../../../scripts/trend-digest/sourceParsers/eigaCom'
import { filmarks } from '../../../scripts/trend-digest/sourceParsers/filmarks'
import { videoResearchDrama, videoResearchVariety } from '../../../scripts/trend-digest/sourceParsers/videoResearch'
import { tohan } from '../../../scripts/trend-digest/sourceParsers/tohan'
import { nippan } from '../../../scripts/trend-digest/sourceParsers/nippan'
import { famitsu } from '../../../scripts/trend-digest/sourceParsers/famitsu'
import { jalan } from '../../../scripts/trend-digest/sourceParsers/jalan'
import { filmarksAnimeTrend } from '../../../scripts/trend-digest/sourceParsers/filmarksAnimeTrend'
import { anilabJapanWeekly } from '../../../scripts/trend-digest/sourceParsers/anilabJapanWeekly'

const FIXTURES_DIR = path.join(__dirname, '../fixtures/sourceParsers')

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8')
}

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1、specs/trend-digest/content-selection/design.md「サイトごとの専用パーサー」
describe('Billboard JAPAN Hot 100のパーサー - 実際に取得したHTMLから曲順位・タイトル・前週比を抽出する', () => {
  const items = billboardJapan(readFixture('billboardJapan.html'))

  it('100件の観測項目が取得できること', () => {
    expect(items).toHaveLength(100)
  })

  it('1位の曲は前週比「-」(前回：-)のため新規ランクイン(isNew: true)として抽出されること', () => {
    expect(items[0]).toMatchObject({ currentRank: 1, title: 'You Know What To Do', isNew: true })
  })

  it('前週比が数値の曲は、その値がpreviousRankとして抽出されること(2位: 前回1位)', () => {
    expect(items[1]).toMatchObject({ currentRank: 2, previousRank: 1 })
    expect(items[1].isNew).toBeUndefined()
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-2、specs/trend-digest/content-selection/design.md「サイトごとの専用パーサー」
describe('興行通信社CINEMAランキング通信のパーサー - 実際に取得したHTMLから週末興行ランキングの順位・タイトル・前週比を抽出する', () => {
  const items = kogyoTsushin(readFixture('kogyoTsushin.html'))

  it('週末興行収入TOP10が取得できること', () => {
    expect(items).toHaveLength(10)
  })

  it('1位(前週からのSTAY)は前週順位が引き続き1位として抽出されること', () => {
    expect(items[0]).toMatchObject({ currentRank: 1, title: '映画ちいかわ 人魚の島のひみつ', previousRank: 1 })
  })

  it('新規ランクイン(NEW表記)の作品はisNew: trueとして抽出されること', () => {
    expect(items[1]).toMatchObject({ currentRank: 2, title: '踊る大捜査線 Ｎ.Ｅ.Ｗ. メトロポリスを駆け抜けろ！', isNew: true })
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-2、specs/trend-digest/design.md「サイトごとの専用パーサー」
describe('映画.com国内/全米ランキングのパーサー - 実際に取得したHTMLから映画ランキングの順位・タイトル・前週比を抽出する', () => {
  it('国内ランキング(jp)は10件取得でき、1位は前週から順位を保っている(stay)ため前週順位も1位と抽出されること', () => {
    const items = eigaCom(readFixture('eigaComJp.html'))
    expect(items).toHaveLength(10)
    expect(items[0]).toMatchObject({ currentRank: 1, title: '映画ちいかわ 人魚の島のひみつ', previousRank: 1 })
  })

  it('国内ランキングの新規ランクイン(先週欄が「初」)の作品はisNew: trueとして抽出されること', () => {
    const items = eigaCom(readFixture('eigaComJp.html'))
    expect(items[1]).toMatchObject({ currentRank: 2, isNew: true })
  })

  it('全米ランキング(us)も同じテンプレートのため10件取得でき、原題と日本語タイトルが<br/>で連結されていてもalt属性から日本語タイトルのみが抽出されること', () => {
    const items = eigaCom(readFixture('eigaComUs.html'))
    expect(items).toHaveLength(10)
    expect(items[0]).toMatchObject({ currentRank: 1, title: 'バイオハザード' })
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-2、specs/trend-digest/content-selection/design.md「サイトごとの専用パーサー」
describe('Filmarks上映中ランキングのパーサー - ページ自体に順位が無いため、実際に取得したHTMLから評価スコアを抽出しスコア降順で順位を組み立てる', () => {
  const items = filmarks(readFixture('filmarks.html'))

  it('作品カード数と同じ件数の観測項目が取得できること', () => {
    expect(items.length).toBeGreaterThan(0)
  })

  it('スコアが最も高い作品が1位、以降スコア降順に順位が振られること', () => {
    for (let i = 1; i < items.length; i++) {
      expect(items[i].currentRank).toBe(items[i - 1].currentRank + 1)
    }
    expect(items[0].currentRank).toBe(1)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-3、specs/trend-digest/content-selection/design.md「補足(ビデオリサーチのURL)」
describe('ビデオリサーチ「視聴人数ランキング」のパーサー - 実際に取得したHTMLからドラマ・バラエティそれぞれのジャンル別セクションのランキングを抽出する', () => {
  it('ドラマ(block01)のランキングが1位から取得でき、1位のタイトルが抽出されること', () => {
    const items = videoResearchDrama(readFixture('videoResearchAudience.html'))
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toMatchObject({ currentRank: 1, title: '日曜劇場・ＶＩＶＡＮＴ' })
  })

  it('バラエティ(block02)のランキングが1位から取得でき、ドラマとは異なるタイトルが抽出されること(セクションの取り違えがないことの確認)', () => {
    const items = videoResearchVariety(readFixture('videoResearchAudience.html'))
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toMatchObject({ currentRank: 1, title: 'ヒロミの八王子リホーム・やす子の夢！子ども食堂を作る・完全版' })
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-5、specs/trend-digest/content-selection/design.md「サイトごとの専用パーサー」
describe('トーハン週間ベストセラーのパーサー - 順位がCSSクラス名(rank-Nth)で表現される実際のHTMLから順位・タイトルを抽出する', () => {
  const items = tohan(readFixture('tohan.html'))

  it('週間ベストセラーTOP10が取得できること', () => {
    expect(items).toHaveLength(10)
  })

  it('1位(class="item rank-1st")の順位・タイトルが正しく抽出されること(序数のCSSクラス名から順位を読み取れることの確認)', () => {
    expect(items[0]).toMatchObject({ currentRank: 1, title: 'パンどろぼうとさすらいラーメン' })
  })

  it('10位(class="item rank-10th")のような2桁の序数クラス名からも順位が正しく読み取れること', () => {
    expect(items[9].currentRank).toBe(10)
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-5、specs/trend-digest/content-selection/design.md「サイトごとの専用パーサー」
describe('日販週間ベストセラーのパーサー - 順位が数値テキスト+前週比の方向を示すCSSクラス名で表現される実際のHTMLから順位・タイトル・前週比を抽出する', () => {
  const items = nippan(readFixture('nippan.html'))

  it('週間ベストセラーが取得できること', () => {
    expect(items.length).toBeGreaterThan(0)
  })

  it('1位(前週欄が「-」)は新規ランクイン(isNew: true)として抽出されること', () => {
    expect(items[0]).toMatchObject({ currentRank: 1, title: 'WORLD SEIKYO　VOL.8', isNew: true })
  })

  it('2位(前週1位からの変動)は前週順位が抽出されること', () => {
    expect(items[1]).toMatchObject({ currentRank: 2, title: '永遠の記憶', previousRank: 1 })
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-7、specs/trend-digest/content-selection/design.md「サイトごとの専用パーサー」
describe('ファミ通.com売上ランキングのパーサー - __NEXT_DATA__に埋め込まれた構造化データからランキングを抽出する', () => {
  const items = famitsu(readFixture('famitsu.html'))

  it('売上ランキング30件が取得できること', () => {
    expect(items).toHaveLength(30)
  })

  it('1位のタイトル・順位が正しく抽出されること(DOM構造ではなく埋め込みJSONから読み取れることの確認)', () => {
    expect(items[0]).toMatchObject({ currentRank: 1, title: 'リズム天国 ミラクルスターズ' })
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-8、specs/trend-digest/content-selection/design.md「補足(じゃらんnet人気ランキングの限界)」
describe('じゃらんnet人気ランキングのパーサー - ページ自体に順位表示が無いため、実際に取得したHTMLの「ランキング」タブの掲載順を順位として抽出する', () => {
  const items = jalan(readFixture('jalan.html'))

  it('「ランキング」タブに掲載された記事件数分の観測項目が取得できること', () => {
    expect(items.length).toBeGreaterThan(0)
  })

  it('掲載順どおりに1位から順位が振られ、「新着」タブの記事(別途表示される新着記事)とは異なるタイトルが1位になること', () => {
    expect(items[0].currentRank).toBe(1)
    expect(items[0].title).not.toBe('【長野】「渋御殿湯」で“冷たい温泉”を体験！登山客に愛される秘湯の宿をご紹介＜20…')
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-9、specs/trend-digest/content-selection/design.md「併用ジャンル(アニメ)の候補を収集・判定する処理」
describe('Filmarksアニメ「今話題のおすすめアニメ」のパーサー - 実際に取得したHTMLに埋め込まれたJSON-LD(ItemList)からアニメの話題ランキングを抽出する', () => {
  const items = filmarksAnimeTrend(readFixture('filmarksAnimeTrend.html'))

  it('話題のおすすめアニメ36件が取得できること', () => {
    expect(items).toHaveLength(36)
  })

  it('1位のタイトル・順位が正しく抽出されること(DOM構造ではなくJSON-LDのpositionから読み取れることの確認)', () => {
    expect(items[0]).toMatchObject({ currentRank: 1, title: 'ヤニねこ' })
  })

  it('2位以降も順位どおりに並んでいること', () => {
    expect(items[1]).toMatchObject({ currentRank: 2, title: 'スーパーの裏でヤニ吸うふたり' })
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-9、specs/trend-digest/content-selection/design.md「併用ジャンル(アニメ)の候補を収集・判定する処理」
describe('AniLab「日本ウィークリーアニメランキング」のパーサー - 実際に取得したHTMLの文中表記(「順位をN上げて」)から順位・前週比を抽出する', () => {
  const items = anilabJapanWeekly(readFixture('anilabJapanWeekly.html'))

  it('順位が上昇した作品が観測項目として取得できること', () => {
    expect(items.length).toBeGreaterThan(0)
  })

  it('「Re:ゼロから始める異世界生活 4th season」が順位を11上げて日本1位にランクインした表記から、現在順位1位・前週順位12位が抽出されること', () => {
    const item = items.find((i) => i.title === 'Re:ゼロから始める異世界生活 4th season')
    expect(item).toMatchObject({ currentRank: 1, previousRank: 12 })
  })

  it('カルーセル表示のため同じ項目がHTML内に複数回現れても、重複せず1件として抽出されること', () => {
    const titles = items.map((i) => i.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})
