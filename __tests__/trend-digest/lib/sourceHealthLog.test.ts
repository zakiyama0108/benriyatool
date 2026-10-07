import { describe, it, expect } from 'vitest'
import { buildHealthLogLines, buildSelectionLogLines } from '../../../app/trend-digest/lib/sourceHealthLog'

// 仕様: specs/trend-digest/content-selection/requirements.md#情報源の健全性監視-1
describe('情報源・ジャンルごとの取得件数ログ - 観測項目数と候補件数を分けて出力し、候補件数が0件(取得失敗を含む)のものは警告として区別できる', () => {
  it('観測項目数・候補件数がともに1件以上かつ取得成功のときは通常の行になること', () => {
    const lines = buildHealthLogLines([
      { label: '音楽 / Billboard JAPAN Hot 100', ok: true, observationCount: 30, candidateCount: 3 },
    ])
    expect(lines).toEqual(['音楽 / Billboard JAPAN Hot 100: 観測30件・候補3件'])
  })

  it('取得に失敗した情報源はWARN付きで区別できること(観測項目数・候補件数の表示より取得失敗を優先する)', () => {
    const lines = buildHealthLogLines([
      { label: '音楽 / Billboard JAPAN Hot 100', ok: false, observationCount: 0, candidateCount: 0 },
    ])
    expect(lines).toEqual(['WARN 音楽 / Billboard JAPAN Hot 100: 取得失敗'])
  })

  it('取得は成功し観測項目はあるが、候補件数が0件(採用基準を満たす項目がない)場合もWARN付きで区別できること(観測項目数ではなく候補件数で判断する。慢性的な0件をsource-reviewの月次見直しで拾えるようにするため)', () => {
    const lines = buildHealthLogLines([{ label: 'グルメ', ok: true, observationCount: 12, candidateCount: 0 }])
    expect(lines).toEqual(['WARN グルメ: 観測12件・候補0件'])
  })

  it('複数の情報源・ジャンルを渡すと、それぞれ対応する行が順番どおりに返ること', () => {
    const lines = buildHealthLogLines([
      { label: 'A', ok: true, observationCount: 5, candidateCount: 2 },
      { label: 'B', ok: false, observationCount: 0, candidateCount: 0 },
    ])
    expect(lines).toEqual(['A: 観測5件・候補2件', 'WARN B: 取得失敗'])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#情報源の健全性監視-2
describe('掲載する話題の選定内訳ログ - 候補から選んだか、採用基準に届かなかった観測項目から選んだかをジャンルごとに記録する', () => {
  it('候補から選んだジャンルは「候補から選定」、観測項目から選んだジャンルは「採用基準未達の観測項目から選定」と表示され、継続度・注目度ラベル・報告回数も記録されること', () => {
    const lines = buildSelectionLogLines([
      { label: '音楽', pickedFromCandidates: true, durationLabel: '話題', heatLabel: '注目度 高い', reportCount: 2 },
      { label: 'グルメ', pickedFromCandidates: false, durationLabel: '流行前', heatLabel: '注目度 低い', reportCount: 1 },
    ])
    expect(lines).toEqual([
      '音楽: 候補から選定 / 継続度=話題 注目度=注目度 高い 報告2回目',
      'グルメ: 採用基準未達の観測項目から選定 / 継続度=流行前 注目度=注目度 低い 報告1回目',
    ])
  })
})
