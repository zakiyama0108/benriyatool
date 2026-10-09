import { describe, it, expect } from 'vitest'
import { DIGEST_APPS } from '../../../app/blog/lib/digestApps'

// 仕様: specs/blog/digest-hub/requirements.md#ダイジェストカード一覧-1、specs/blog/digest-hub/requirements.md#ダイジェストカード一覧-4、specs/blog/digest-hub/design.md#決定事項-配信曜日・1行概要の持ち方
describe('5アプリの定数(DIGEST_APPS) - /blogのカード一覧・情報源一覧タブの両方が参照する唯一の定義元', () => {
  it('対象5アプリがai-dev-digest→news-digest→trend-digest→future-digest→research-digestの順で5件定義されていること', () => {
    expect(DIGEST_APPS).toHaveLength(5)
    expect(DIGEST_APPS.map((app) => app.id)).toEqual([
      'ai-dev-digest',
      'news-digest',
      'trend-digest',
      'future-digest',
      'research-digest',
    ])
  })

  it('各要素がid/name/description/scheduleLabel/href/iconをすべて持つこと', () => {
    for (const app of DIGEST_APPS) {
      expect(typeof app.id).toBe('string')
      expect(typeof app.name).toBe('string')
      expect(typeof app.description).toBe('string')
      expect(typeof app.scheduleLabel).toBe('string')
      expect(typeof app.href).toBe('string')
      expect(typeof app.icon).toBe('string')
      expect(app.id.length).toBeGreaterThan(0)
      expect(app.name.length).toBeGreaterThan(0)
      expect(app.description.length).toBeGreaterThan(0)
      expect(app.scheduleLabel.length).toBeGreaterThan(0)
      expect(app.icon.length).toBeGreaterThan(0)
    }
  })
})

// 仕様: specs/blog/digest-hub/requirements.md#ダイジェストカード一覧-3
describe('配信曜日ラベル(scheduleLabel) - 本番で実際に配信されている曜日(未実装の週2回化spec等は反映しない)', () => {
  it('ai-dev-digestは「毎日」、news-digestは「毎週水曜」、trend-digestは「火・金(週2回)」、future-digestは「毎週木曜」、research-digestは「毎週月曜」であること', () => {
    const byId = Object.fromEntries(DIGEST_APPS.map((app) => [app.id, app]))
    expect(byId['ai-dev-digest'].scheduleLabel).toBe('毎日')
    expect(byId['news-digest'].scheduleLabel).toBe('毎週水曜')
    expect(byId['trend-digest'].scheduleLabel).toBe('火・金(週2回)')
    expect(byId['future-digest'].scheduleLabel).toBe('毎週木曜')
    expect(byId['research-digest'].scheduleLabel).toBe('毎週月曜')
  })

  it('各アプリのhrefがそのアプリのトップページを指すこと', () => {
    const byId = Object.fromEntries(DIGEST_APPS.map((app) => [app.id, app]))
    expect(byId['ai-dev-digest'].href).toBe('/ai-dev-digest')
    expect(byId['news-digest'].href).toBe('/news-digest')
    expect(byId['trend-digest'].href).toBe('/trend-digest')
    expect(byId['future-digest'].href).toBe('/future-digest')
    expect(byId['research-digest'].href).toBe('/research-digest')
  })
})

// 仕様: specs/blog/digest-hub/requirements.md#カードの表示内容の出所-1
describe('1行概要(description) - README「アプリ一覧」の概要文を踏襲し、新しい文言をこのspec側で作らない', () => {
  it('各アプリの概要文がREADME「アプリ一覧」表の概要文と一致すること', () => {
    const byId = Object.fromEntries(DIGEST_APPS.map((app) => [app.id, app]))
    expect(byId['ai-dev-digest'].description).toBe(
      'AI駆動開発関連の話題コンテンツを毎日自動収集・翻訳・要約し、ダイジェスト記事として公開する'
    )
    expect(byId['news-digest'].description).toBe(
      '総合・経済/ビジネス・神奈川ローカル・育児の重要ニュースを毎週自動収集・要約し、ダイジェスト記事として公開する'
    )
    expect(byId['trend-digest'].description).toBe(
      '音楽・映画・グルメなど様々なジャンルの流行を週2回自動収集・要約し、ダイジェスト記事として公開する'
    )
    expect(byId['future-digest'].description).toBe(
      '10ジャンルの未来予測記事を時間軸(近未来〜超長期未来)ごとに影響度付きで毎週木曜に要約・公開する'
    )
    expect(byId['research-digest'].description).toBe(
      '10ジャンルから暮らしへの影響が大きい研究・論文を1本ずつ毎週月曜に要約・公開する'
    )
  })
})
