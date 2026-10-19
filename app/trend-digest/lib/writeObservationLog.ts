import fs from 'node:fs'
import path from 'node:path'
import type { Edition } from './types'
import type { Candidate } from './candidateTypes'
import type { Observation, ObservationLog } from './historyTypes'
import { normalizeTitle } from './selection'
import { parseObservationLog } from './historySchema'

// その回の観測を履歴に記録する処理(仕様: design.md「その回の観測を履歴に記録する処理」)。
// content-selectionがその回に情報源から取得した全項目(採用基準の判定前の全件。edition内の
// 全ジャンル分を1つの配列で受け取る)を、1回の実行=1ファイルの観測ログとして書き出す。
// 一度書いたファイルは後から書き換えない(追記専用。design.md「履歴データの形式」)

// candidate1件を観測ログの強さ(履歴側の尺度)に変換する(design.md「履歴データの形式」)。
// 固定リストは(記録上限+1)-順位(上位ほど大きい値。100-順位をそのまま使うと101位以降で
// 負値になりバリデーションを通らないため)、WebSearchは独立言及元数(candidate.strengthそのまま)
function toObservationStrength(candidate: Candidate, maxObservationsPerSource: number): number {
  if (candidate.method === 'fixed-list' && candidate.rank !== null) {
    return maxObservationsPerSource + 1 - candidate.rank
  }
  return candidate.strength
}

function toObservation(candidate: Candidate, maxObservationsPerSource: number): Observation {
  if (candidate.method === 'hybrid') {
    throw new Error(`観測項目1件はfixed-listまたはwebsearchのいずれかである必要があります(title: ${candidate.title})`)
  }
  return {
    genre: candidate.genre,
    title: candidate.title,
    strength: toObservationStrength(candidate, maxObservationsPerSource),
    meetsCriteria: candidate.meetsCriteria,
    rank: candidate.rank,
    method: candidate.method,
    originRegion: candidate.originRegion,
    currentRegions: candidate.currentRegions,
    strengthJapan: candidate.strengthJapan,
    strengthOverseas: candidate.strengthOverseas,
  }
}

// 情報源ごとに上位maxObservationsPerSource件までに絞る(design.md手順2)。
// sourceNameが無い(グループ化できない)観測はそのまま残す
function capPerSource(candidates: Candidate[], maxObservationsPerSource: number): Candidate[] {
  const groups = new Map<string, Candidate[]>()
  for (const candidate of candidates) {
    const group = groups.get(candidate.sourceName)
    if (group) group.push(candidate)
    else groups.set(candidate.sourceName, [candidate])
  }

  const result: Candidate[] = []
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => {
      const rankA = a.rank ?? Number.POSITIVE_INFINITY
      const rankB = b.rank ?? Number.POSITIVE_INFINITY
      if (rankA !== rankB) return rankA - rankB
      return b.strength - a.strength
    })
    result.push(...sorted.slice(0, maxObservationsPerSource))
  }
  return result
}

// 同じ正規化タイトル・同じ選定方式の観測が同じ回に複数(ジャンル・情報源をまたいで)取れた場合、
// 1件だけ残す(design.md手順3)。優先順: (a)順位を持つ観測 (b)順位が最上位 (c)順位がなければ強さが最大
function pickBest(a: Candidate, b: Candidate): Candidate {
  if ((a.rank !== null) !== (b.rank !== null)) return a.rank !== null ? a : b
  if (a.rank !== null && b.rank !== null) return a.rank <= b.rank ? a : b
  return a.strength >= b.strength ? a : b
}

function dedupeAcrossGenres(candidates: Candidate[]): Candidate[] {
  const byKey = new Map<string, Candidate>()
  for (const candidate of candidates) {
    const key = `${normalizeTitle(candidate.title)}|${candidate.method}`
    const existing = byKey.get(key)
    byKey.set(key, existing ? pickBest(existing, candidate) : candidate)
  }
  return [...byKey.values()]
}

// その回の観測項目(edition内の全ジャンル分。採用基準の判定前の全件)を
// historyDir/<date>-<edition>.jsonへ書き出す。同名ファイルが既にある場合は上書きせず例外にする
// (design.md手順4。追記専用の前提を壊さないため)
export function writeObservationLog(
  historyDir: string,
  date: string,
  edition: Edition,
  candidates: Candidate[],
  maxObservationsPerSource: number
): ObservationLog {
  const capped = capPerSource(candidates, maxObservationsPerSource)
  const deduped = dedupeAcrossGenres(capped)
  const observations = deduped.map((candidate) => toObservation(candidate, maxObservationsPerSource))

  const log: ObservationLog = { date, edition, observations }
  const filename = `${date}-${edition}.json`
  // 書き出す前にスキーマ検証を行う(構築ロジックの不具合で壊れたデータを書き出さないため)
  parseObservationLog(log, filename, maxObservationsPerSource)

  fs.mkdirSync(historyDir, { recursive: true })
  const filePath = path.join(historyDir, filename)
  if (fs.existsSync(filePath)) {
    throw new Error(`${filename}は既に存在します(観測ログは追記専用のため上書きしません)`)
  }
  fs.writeFileSync(filePath, JSON.stringify(log, null, 2) + '\n')

  return log
}
