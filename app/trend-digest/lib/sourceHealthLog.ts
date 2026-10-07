// 情報源・ジャンルごとの取得件数ログ(仕様: requirements.md#情報源の健全性監視-1〜2、design.md「ログ」)。
// 観測項目数(採用基準の判定前)と候補件数(採用基準を満たした件数)を分けて記録し、候補件数が0件
// (取得失敗を含む)の情報源・ジャンルはWARNとして区別できるようにする。観測項目は情報源が項目を
// 返す限り常に数十件出るため、この2つを1つの数値にまとめると情報源の健全性が読み取れなくなる

export type SourceCollectionStat = {
  label: string // 例: "音楽 / Billboard JAPAN Hot 100"、"グルメ"(WebSearchジャンルはジャンル名のみ)
  ok: boolean // 取得・検索自体に成功したか(失敗時はその情報源・ジャンルだけ除外して続行する)
  observationCount: number // 観測項目数(採用基準の判定前。記録上限適用後)
  candidateCount: number // 候補件数(採用基準を満たした件数)
}

export function buildHealthLogLines(stats: SourceCollectionStat[]): string[] {
  return stats.map((s) => {
    if (!s.ok) return `WARN ${s.label}: 取得失敗`
    const body = `${s.label}: 観測${s.observationCount}件・候補${s.candidateCount}件`
    // 候補件数が0件だった情報源・ジャンルはWARNとして区別する(観測項目数ではなく候補件数で判断する。
    // design.md「ログ」。慢性的な0件をsource-reviewの月次見直しで拾えるようにするため)
    return s.candidateCount === 0 ? `WARN ${body}` : body
  })
}

// ジャンルの掲載する話題を、候補(採用基準を満たした項目)から選んだか、採用基準に届かなかった
// 観測項目全体から選んだかを記録する(requirements.md#情報源の健全性監視-2、design.md「ログ」)。
// 後者が慢性的に続くジャンルは、情報源か採用基準のどちらかが実態に合っていないため月次見直しで拾う。
// trend-historyの判定結果(継続度・注目度ラベル・報告回数)が確定した時点でcollect-and-select.tsから呼ぶ
export type GenreSelectionLog = {
  label: string
  pickedFromCandidates: boolean
  durationLabel: string
  heatLabel: string
  reportCount: number
}

export function buildSelectionLogLines(logs: GenreSelectionLog[]): string[] {
  return logs.map(
    (l) =>
      `${l.label}: ${l.pickedFromCandidates ? '候補から選定' : '採用基準未達の観測項目から選定'}` +
      ` / 継続度=${l.durationLabel} 注目度=${l.heatLabel} 報告${l.reportCount}回目`
  )
}
