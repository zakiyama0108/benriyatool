import { describe, it, expect } from 'vitest'
import { buildHealthLogLines } from '../../../app/trend-digest/lib/sourceHealthLog'

// 仕様: specs/trend-digest/content-selection/requirements.md#情報源の健全性監視-1
describe('情報源・ジャンルごとの取得件数ログ - 収集した候補件数(取得失敗はその旨)をジャンルごとに出力し、0件のものは警告として区別できる', () => {
  it('件数が1件以上かつ取得成功のときは通常の行になること', () => {
    const lines = buildHealthLogLines([{ label: '音楽 / Oricon週間チャート', ok: true, count: 3 }])
    expect(lines).toEqual(['音楽 / Oricon週間チャート: 3件'])
  })

  it('取得に失敗した情報源はWARN付きで区別できること', () => {
    const lines = buildHealthLogLines([{ label: '音楽 / Billboard JAPAN Hot 100', ok: false, count: 0 }])
    expect(lines).toEqual(['WARN 音楽 / Billboard JAPAN Hot 100: 取得失敗'])
  })

  it('取得は成功したが候補が0件だったジャンル・情報源もWARN付きで区別できること(慢性的な0件を月次見直しで拾えるようにするため)', () => {
    const lines = buildHealthLogLines([{ label: 'グルメ', ok: true, count: 0 }])
    expect(lines).toEqual(['WARN グルメ: 0件'])
  })

  it('複数の情報源・ジャンルを渡すと、それぞれ対応する行が順番どおりに返ること', () => {
    const lines = buildHealthLogLines([
      { label: 'A', ok: true, count: 2 },
      { label: 'B', ok: false, count: 0 },
    ])
    expect(lines).toEqual(['A: 2件', 'WARN B: 取得失敗'])
  })
})
