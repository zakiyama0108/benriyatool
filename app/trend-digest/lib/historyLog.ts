import type { Edition, Genre } from './types'

// 履歴の判定結果のログ出力(仕様: design.md「ログ」)。
// 観測ログを書き出した際の実行日・編・記録した観測件数、全話題の継続度・注目度ラベルごとの件数、
// ジャンルごとの注目度の判定方法(過去の分布/情報源での位置)、地域情報が「不明」のまま記録された
// 話題の件数を標準エラー出力へ記録する(分布の偏り・慢性的な地域不明をsource-reviewの
// 月次見直しで拾えるようにするため)。入出力が純粋なデータのみのため通常のvitestで完全にテストできる

export type HistoryLogInput = {
  date: string
  edition: Edition
  writtenObservationCount: number
  durationLabelCounts: Record<string, number>
  heatLabelCounts: Record<string, number>
  heatBasisByGenre: Map<Genre, Set<'distribution' | 'source-position'>>
  unknownOriginRegionCount: number
}

export function buildHistoryLogLines(input: HistoryLogInput): string[] {
  const lines: string[] = [
    `観測ログを書き出しました: ${input.date}-${input.edition}.json(観測${input.writtenObservationCount}件)`,
    `継続度ラベルの件数: ${JSON.stringify(input.durationLabelCounts)}`,
    `注目度ラベルの件数: ${JSON.stringify(input.heatLabelCounts)}`,
    'ジャンルごとの注目度の判定方法:',
  ]
  for (const [genre, bases] of input.heatBasisByGenre) {
    lines.push(`  ${genre}: ${[...bases].join('・')}`)
  }
  lines.push(`発祥地域が不明の話題数: ${input.unknownOriginRegionCount}件`)
  return lines
}
