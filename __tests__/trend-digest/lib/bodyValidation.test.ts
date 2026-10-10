import { describe, it, expect } from 'vitest'
import {
  BODY_MIN_LENGTH,
  BODY_MAX_LENGTH,
  isValidTopicBodyLength,
  isDuplicateOfLastPublishedBody,
} from '../../../app/trend-digest/lib/bodyValidation'

// 160〜480字ちょうどのダミー本文を作る
function makeBody(length: number): string {
  return 'あ'.repeat(length)
}

// 仕様: specs/trend-digest/content-generation/requirements.md#要約-2、specs/trend-digest/content-generation/design.md#本文の分量を検証する処理(決定的なコード)
describe('本文の分量検証 - 「200〜400字程度」の目安を、ai-dev-digestの±20%許容幅と同じ考え方で160〜480字の範囲として判定する', () => {
  it('160字未満の本文はfalseになること', () => {
    expect(isValidTopicBodyLength(makeBody(BODY_MIN_LENGTH - 1))).toBe(false)
  })

  it('480字を超える本文はfalseになること', () => {
    expect(isValidTopicBodyLength(makeBody(BODY_MAX_LENGTH + 1))).toBe(false)
  })

  it('境界値の160字ちょうどの本文はtrueになること', () => {
    expect(isValidTopicBodyLength(makeBody(BODY_MIN_LENGTH))).toBe(true)
  })

  it('境界値の480字ちょうどの本文はtrueになること', () => {
    expect(isValidTopicBodyLength(makeBody(BODY_MAX_LENGTH))).toBe(true)
  })

  it('160〜480字の範囲内(300字)の本文はtrueになること', () => {
    expect(isValidTopicBodyLength(makeBody(300))).toBe(true)
  })

  // エージェントが取得困難時に返す{ heading: null, body: null }のnullを失敗シグナルとして扱う(design.md「見出し・本文を書く処理」応答JSONの形式)
  it('bodyがnullの場合、不正(false)になること', () => {
    expect(isValidTopicBodyLength(null)).toBe(false)
  })

  it('bodyが空文字の場合、不正(false)になること', () => {
    expect(isValidTopicBodyLength('')).toBe(false)
  })

  it('bodyが文字列でない場合(数値など)、不正(false)になること', () => {
    expect(isValidTopicBodyLength(12345)).toBe(false)
  })
})

// 仕様: specs/trend-digest/content-generation/requirements.md#エージェントの逸脱防止-7、specs/trend-digest/content-generation/design.md#本文の分量を検証する処理(決定的なコード)
describe('続報の重複本文検知 - 前回掲載時の本文と完全に同一の本文を、同じ内容の繰り返し公開を防ぐ最終防波堤として検知する', () => {
  it('前回掲載時の本文と一字一句同じ本文は重複と判定されること', () => {
    const body = makeBody(200)
    expect(isDuplicateOfLastPublishedBody(body, body)).toBe(true)
  })

  it('前回掲載時の本文と前後の空白だけが異なる本文は重複と判定されること(前後の空白を除いて比較する)', () => {
    const body = makeBody(200)
    expect(isDuplicateOfLastPublishedBody(`  ${body}\n`, body)).toBe(true)
  })

  it('1文字でも異なる本文は重複と判定されないこと', () => {
    const previous = makeBody(200)
    const current = `${makeBody(199)}い` // 末尾1文字だけ異なる
    expect(isDuplicateOfLastPublishedBody(current, previous)).toBe(false)
  })

  it('前回掲載時の本文がない(初回掲載)場合は、重複と判定されないこと', () => {
    expect(isDuplicateOfLastPublishedBody(makeBody(200), null)).toBe(false)
  })
})
