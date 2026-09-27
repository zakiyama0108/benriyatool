import { describe, it, expect } from 'vitest'
import { normalizeUrl, buildDeliveredIndex } from '../../../app/future-digest/lib/deliveredIndex'
import type { Article, Prediction } from '../../../app/future-digest/lib/types'

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: 'technology-ai--near',
    genre: 'technology-ai',
    horizon: 'near',
    heading: '見出しA',
    body: 'あ'.repeat(200),
    impact: 'high',
    impactReason: '根拠',
    targetPeriod: '2030年まで',
    sourceTitle: '元記事タイトルA',
    sourceName: '情報源A',
    sourceUrl: 'https://example.com/a',
    ...overrides,
  }
}

function makeArticle(predictions: Prediction[]): Article {
  return { id: '2026-10-01', date: '2026-10-01', issueNumber: 1, predictions, emptySlots: [] }
}

// 仕様: specs/future-digest/content-selection/requirements.md#配信済みの記事・予測の除外-1
describe('normalizeUrl - スキーム・ホスト名の大文字小文字・末尾スラッシュ・フラグメント・計測用クエリの違いを同一視する', () => {
  it('スキーム・ホスト名の大文字小文字を無視して同一視すること', () => {
    expect(normalizeUrl('HTTPS://Example.COM/path')).toBe(normalizeUrl('https://example.com/path'))
  })

  it('末尾スラッシュの有無を同一視すること', () => {
    expect(normalizeUrl('https://example.com/path/')).toBe(normalizeUrl('https://example.com/path'))
  })

  it('URL内の#以降(フラグメント)を無視すること', () => {
    expect(normalizeUrl('https://example.com/path#section')).toBe(normalizeUrl('https://example.com/path'))
  })

  it('utm_で始まる計測用クエリを無視すること', () => {
    expect(normalizeUrl('https://example.com/path?utm_source=x&utm_medium=y')).toBe(normalizeUrl('https://example.com/path'))
  })

  it('utm_以外のクエリは区別すること(除去しない)', () => {
    expect(normalizeUrl('https://example.com/path?id=1')).not.toBe(normalizeUrl('https://example.com/path?id=2'))
  })
})

// 仕様: specs/future-digest/content-selection/requirements.md#配信済みの記事・予測の除外-1、specs/future-digest/content-selection/requirements.md#配信済みの記事・予測の除外-2
describe('buildDeliveredIndex - 過去の全予測から正規化URLの集合とジャンル・時間軸・見出し・元記事タイトルの一覧を作る', () => {
  it('全予測の正規化URLの集合を返すこと', () => {
    const article = makeArticle([
      makePrediction({ sourceUrl: 'https://example.com/a/' }),
      makePrediction({ id: 'medical-health--near', genre: 'medical-health', sourceUrl: 'https://example.com/b' }),
    ])
    const index = buildDeliveredIndex([article])
    expect(index.urls.has(normalizeUrl('https://example.com/a'))).toBe(true)
    expect(index.urls.has(normalizeUrl('https://example.com/b'))).toBe(true)
    expect(index.urls.size).toBe(2)
  })

  it('ジャンル・時間軸・見出し・元記事タイトルを1行ずつにした一覧を返すこと(Claudeへの重複判定材料)', () => {
    const article = makeArticle([makePrediction({ heading: '見出しX', sourceTitle: 'タイトルX' })])
    const index = buildDeliveredIndex([article])
    expect(index.lines).toHaveLength(1)
    expect(index.lines[0]).toContain('technology-ai')
    expect(index.lines[0]).toContain('near')
    expect(index.lines[0]).toContain('見出しX')
    expect(index.lines[0]).toContain('タイトルX')
  })

  it('記事が0件でも空の集合・一覧を返すこと', () => {
    const index = buildDeliveredIndex([])
    expect(index.urls.size).toBe(0)
    expect(index.lines).toHaveLength(0)
  })
})
