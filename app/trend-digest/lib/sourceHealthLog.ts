// 情報源・ジャンルごとの取得件数ログ(仕様: requirements.md#情報源の健全性監視-1、design.md「ログ」)。
// 取得失敗・0件だった情報源・ジャンルはWARN付きにして無言停止・慢性的な0件に気づけるようにする。
// 固定リストジャンルの情報源単位・WebSearchジャンルのジャンル単位のどちらでも使える汎用の集計形式にする

export type SourceCollectionStat = {
  label: string // 例: "音楽 / Oricon週間チャート"、"グルメ"(WebSearchジャンルはジャンル名のみ)
  ok: boolean // 取得・検索自体に成功したか(失敗時はその情報源・ジャンルだけ除外して続行する)
  count: number // 収集できた候補件数
}

export function buildHealthLogLines(stats: SourceCollectionStat[]): string[] {
  return stats.map((s) => {
    const body = `${s.label}: ${s.ok ? `${s.count}件` : '取得失敗'}`
    return s.ok && s.count > 0 ? body : `WARN ${body}`
  })
}
